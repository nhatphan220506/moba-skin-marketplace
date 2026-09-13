const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const { deploySystemFixture, hash } = require("./fixtures/system");

async function mintedEntitlementFixture() {
  const system = await deploySystemFixture();
  const design = await system.prepareMarketReady({ roundId: 80n, maxSupply: 5n });
  await system.entitlement
    .connect(system.minter)
    .mint(
      system.buyerB.address,
      design.designId,
      design.designId,
      1n,
      design.metadataURI
    );
  return { ...system, design };
}

describe("SecondaryMarketplace", function () {
  it("rejects every zero constructor dependency", async function () {
    const {
      publisherTreasury,
      marketplaceTreasury,
      assetRegistry,
      payment,
      entitlement,
    } = await loadFixture(deploySystemFixture);
    const Factory = await ethers.getContractFactory("SecondaryMarketplace");
    await expect(
      Factory.deploy(
        ethers.ZeroAddress,
        await payment.getAddress(),
        await entitlement.getAddress(),
        publisherTreasury.address,
        marketplaceTreasury.address
      )
    ).to.be.revertedWith("SecondaryMarketplace: zero asset registry");
    await expect(
      Factory.deploy(
        await assetRegistry.getAddress(),
        await payment.getAddress(),
        await entitlement.getAddress(),
        ethers.ZeroAddress,
        marketplaceTreasury.address
      )
    ).to.be.revertedWith("SecondaryMarketplace: zero publisher treasury");
  });

  it("lists only a transferable entitlement owner at a positive price", async function () {
    const { buyerB, outsider, entitlement, secondary, design } = await loadFixture(
      mintedEntitlementFixture
    );
    await expect(
      secondary.connect(outsider).listForResale(design.designId, design.designId, 200n)
    )
      .to.be.revertedWithCustomError(secondary, "NotEntitlementOwner")
      .withArgs(outsider.address, design.designId);
    await expect(
      secondary.connect(buyerB).listForResale(design.designId, design.designId, 0n)
    )
      .to.be.revertedWithCustomError(secondary, "InvalidPrice")
      .withArgs(0n);
    await entitlement.setTransferable(design.designId, false);
    await expect(
      secondary.connect(buyerB).listForResale(design.designId, design.designId, 200n)
    )
      .to.be.revertedWithCustomError(secondary, "EntitlementNotTransferable")
      .withArgs(design.designId);
    await entitlement.setTransferable(design.designId, true);
    await expect(
      secondary.connect(buyerB).listForResale(design.designId, design.designId, 200n)
    )
      .to.emit(secondary, "ResaleListed")
      .withArgs(1n, design.designId, design.designId, buyerB.address, 200n);
    await expect(
      secondary.connect(buyerB).listForResale(design.designId, design.designId, 200n)
    ).to.be.revertedWith("SecondaryMarketplace: active listing exists");
  });

  it("cancels only by seller and only once", async function () {
    const { buyerB, outsider, secondary, design } = await loadFixture(
      mintedEntitlementFixture
    );
    await secondary.connect(buyerB).listForResale(design.designId, design.designId, 200n);
    await expect(secondary.connect(outsider).cancelListing(1n)).to.be.revertedWith(
      "SecondaryMarketplace: not seller"
    );
    await expect(secondary.connect(buyerB).cancelListing(1n))
      .to.emit(secondary, "ListingCancelled")
      .withArgs(1n, buyerB.address);
    expect((await secondary.getListing(1n)).active).to.equal(false);
    await expect(secondary.connect(buyerB).cancelListing(1n))
      .to.be.revertedWithCustomError(secondary, "ListingNotActive")
      .withArgs(1n);
  });

  it("revalidates self-purchase, suspension, ownership and transferability", async function () {
    const {
      buyerB,
      buyerC,
      outsider,
      assetRegistry,
      entitlement,
      secondary,
      design,
    } = await loadFixture(mintedEntitlementFixture);
    await secondary.connect(buyerB).listForResale(design.designId, design.designId, 200n);
    await expect(secondary.connect(buyerB).buyResale(1n)).to.be.revertedWith(
      "SecondaryMarketplace: seller is buyer"
    );
    await assetRegistry.suspendDesign(design.designId, hash("suspend"));
    await expect(secondary.connect(buyerC).buyResale(1n))
      .to.be.revertedWithCustomError(secondary, "DesignIsSuspended")
      .withArgs(design.designId);
    await assetRegistry.reinstateDesign(design.designId);
    await entitlement.setTransferable(design.designId, false);
    await expect(secondary.connect(buyerC).buyResale(1n))
      .to.be.revertedWithCustomError(secondary, "EntitlementNotTransferable")
      .withArgs(design.designId);
    await entitlement.setTransferable(design.designId, true);
    await entitlement.setMarketplaceAuthorization(outsider.address, true);
    await entitlement
      .connect(outsider)
      .authorisedTransfer(
        buyerB.address,
        outsider.address,
        design.designId,
        design.designId,
        1n
      );
    await expect(secondary.connect(buyerC).buyResale(1n))
      .to.be.revertedWithCustomError(secondary, "SellerNoLongerOwner")
      .withArgs(1n);
  });

  it("purchases atomically and allocates the exact 200 demo split", async function () {
    const {
      artist,
      buyerB,
      buyerC,
      publisherTreasury,
      marketplaceTreasury,
      payment,
      entitlement,
      secondary,
      design,
    } = await loadFixture(mintedEntitlementFixture);
    await secondary.connect(buyerB).listForResale(design.designId, design.designId, 200n);
    const balances = new Map();
    for (const account of [buyerB, artist, publisherTreasury, marketplaceTreasury]) {
      balances.set(account.address, await payment.balanceOf(account.address));
    }
    await expect(secondary.connect(buyerC).buyResale(1n))
      .to.emit(secondary, "ResaleCompleted")
      .withArgs(1n, design.designId, buyerB.address, buyerC.address, 200n, 10n);
    expect((await secondary.getListing(1n)).active).to.equal(false);
    expect(await entitlement.balanceOf(buyerB.address, design.designId)).to.equal(0n);
    expect(await entitlement.balanceOf(buyerC.address, design.designId)).to.equal(1n);
    expect(await entitlement["totalSupply(uint256)"](design.designId)).to.equal(1n);

    for (const [account, amount] of [
      [buyerB, 180n],
      [artist, 10n],
      [publisherTreasury, 6n],
      [marketplaceTreasury, 4n],
    ]) {
      await secondary.connect(account).withdrawProceeds();
      expect(await payment.balanceOf(account.address)).to.equal(
        balances.get(account.address) + amount
      );
      await expect(secondary.connect(account).withdrawProceeds()).to.be.revertedWith(
        "SecondaryMarketplace: nothing to withdraw"
      );
    }
    expect(await payment.balanceOf(await secondary.getAddress())).to.equal(0n);
  });

  it("assigns all rounding remainder to the seller", async function () {
    const {
      buyerB,
      buyerC,
      payment,
      secondary,
      design,
    } = await loadFixture(mintedEntitlementFixture);
    const before = await payment.balanceOf(buyerB.address);
    await secondary.connect(buyerB).listForResale(design.designId, design.designId, 201n);
    await secondary.connect(buyerC).buyResale(1n);
    await secondary.connect(buyerB).withdrawProceeds();
    expect(await payment.balanceOf(buyerB.address)).to.equal(before + 181n);
  });

  it("rolls back payment, accounting and listing when entitlement transfer fails", async function () {
    const {
      buyerB,
      buyerC,
      payment,
      entitlement,
      secondary,
      design,
    } = await loadFixture(mintedEntitlementFixture);
    await secondary.connect(buyerB).listForResale(design.designId, design.designId, 200n);
    const buyerBefore = await payment.balanceOf(buyerC.address);
    await entitlement.pause();
    await expect(secondary.connect(buyerC).buyResale(1n)).to.be.revertedWithCustomError(
      entitlement,
      "EntitlementPaused"
    );
    expect(await payment.balanceOf(buyerC.address)).to.equal(buyerBefore);
    expect(await payment.balanceOf(await secondary.getAddress())).to.equal(0n);
    expect((await secondary.getListing(1n)).active).to.equal(true);
    expect(await entitlement.balanceOf(buyerB.address, design.designId)).to.equal(1n);
    await entitlement.unpause();
    await secondary.connect(buyerC).buyResale(1n);
  });

  it("rolls back when payment allowance is insufficient and closes a listing once", async function () {
    const { buyerB, buyerC, payment, entitlement, secondary, design } =
      await loadFixture(mintedEntitlementFixture);
    await secondary.connect(buyerB).listForResale(design.designId, design.designId, 200n);
    await payment.connect(buyerC).approve(await secondary.getAddress(), 0n);
    await expect(secondary.connect(buyerC).buyResale(1n)).to.be.reverted;
    expect((await secondary.getListing(1n)).active).to.equal(true);
    expect(await entitlement.balanceOf(buyerB.address, design.designId)).to.equal(1n);
    await payment.connect(buyerC).approve(await secondary.getAddress(), 200n);
    await secondary.connect(buyerC).buyResale(1n);
    await expect(secondary.connect(buyerC).buyResale(1n))
      .to.be.revertedWithCustomError(secondary, "AlreadyPurchased")
      .withArgs(1n);
  });
});
