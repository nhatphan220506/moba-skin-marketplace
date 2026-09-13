const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const { deploySystemFixture } = require("./fixtures/system");

describe("MockVND", function () {
  it("assigns admin and minter roles only to the deployer", async function () {
    const { admin, outsider, payment } = await loadFixture(deploySystemFixture);
    expect(await payment.hasRole(await payment.DEFAULT_ADMIN_ROLE(), admin.address)).to.equal(true);
    expect(await payment.hasRole(await payment.MINTER_ROLE(), admin.address)).to.equal(true);
    expect(await payment.hasRole(await payment.MINTER_ROLE(), outsider.address)).to.equal(false);
  });

  it("allows a minter to mint and rejects an unauthorized caller with the frozen error", async function () {
    const { admin, buyerA, outsider, payment } = await loadFixture(deploySystemFixture);
    await expect(payment.mint(buyerA.address, 25n))
      .to.emit(payment, "Transfer")
      .withArgs(ethers.ZeroAddress, buyerA.address, 25n);
    await expect(payment.connect(outsider).mint(buyerA.address, 1n))
      .to.be.revertedWithCustomError(payment, "UnauthorizedMinter")
      .withArgs(outsider.address);
    await payment.grantRole(await payment.MINTER_ROLE(), outsider.address);
    expect(await payment.hasRole(await payment.MINTER_ROLE(), outsider.address)).to.equal(true);
    await payment.connect(outsider).mint(buyerA.address, 1n);
    expect(await payment.balanceOf(buyerA.address)).to.equal(10_026n);
    expect(admin.address).not.to.equal(outsider.address);
  });

  it("transfers balances and emits the ERC20 Transfer event", async function () {
    const { buyerA, buyerB, payment } = await loadFixture(deploySystemFixture);
    await expect(payment.connect(buyerA).transfer(buyerB.address, 40n))
      .to.emit(payment, "Transfer")
      .withArgs(buyerA.address, buyerB.address, 40n);
    expect(await payment.balanceOf(buyerA.address)).to.equal(9_960n);
    expect(await payment.balanceOf(buyerB.address)).to.equal(10_040n);
  });

  it("reports exact balance and four-argument allowance failures", async function () {
    const { buyerA, buyerB, outsider, payment } = await loadFixture(deploySystemFixture);
    await expect(payment.connect(outsider).transfer(buyerA.address, 1n))
      .to.be.revertedWithCustomError(payment, "InsufficientBalance")
      .withArgs(outsider.address, 0n, 1n);

    await payment.connect(buyerA).approve(outsider.address, 5n);
    await expect(
      payment.connect(outsider).transferFrom(buyerA.address, buyerB.address, 6n)
    )
      .to.be.revertedWithCustomError(payment, "InsufficientAllowance")
      .withArgs(buyerA.address, outsider.address, 5n, 6n);
  });

  it("supports allowance spending and infinite allowance semantics", async function () {
    const { buyerA, buyerB, outsider, payment } = await loadFixture(deploySystemFixture);
    await expect(payment.connect(buyerA).approve(outsider.address, 50n))
      .to.emit(payment, "Approval")
      .withArgs(buyerA.address, outsider.address, 50n);
    await payment.connect(outsider).transferFrom(buyerA.address, buyerB.address, 20n);
    expect(await payment.allowance(buyerA.address, outsider.address)).to.equal(30n);

    await payment.connect(buyerA).approve(outsider.address, ethers.MaxUint256);
    await payment.connect(outsider).transferFrom(buyerA.address, buyerB.address, 1n);
    expect(await payment.allowance(buyerA.address, outsider.address)).to.equal(
      ethers.MaxUint256
    );
  });
});
