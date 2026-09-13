const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const { deploySystemFixture, hash } = require("./fixtures/system");

describe("SkinEntitlement1155", function () {
  it("rejects zero dependencies and grants only default admin at deployment", async function () {
    const { admin, outsider, assetRegistry, compatibility, entitlement } =
      await loadFixture(deploySystemFixture);
    const Factory = await ethers.getContractFactory("SkinEntitlement1155");
    await expect(
      Factory.deploy(ethers.ZeroAddress, await compatibility.getAddress())
    ).to.be.revertedWith("SkinEntitlement1155: zero asset registry");
    await expect(
      Factory.deploy(await assetRegistry.getAddress(), ethers.ZeroAddress)
    ).to.be.revertedWith("SkinEntitlement1155: zero compatibility registry");
    expect(
      await entitlement.hasRole(await entitlement.DEFAULT_ADMIN_ROLE(), admin.address)
    ).to.equal(true);
    expect(
      await entitlement.hasRole(await entitlement.MINTER_ROLE(), outsider.address)
    ).to.equal(false);
  });

  it("allows only minter and requires technical approval", async function () {
    const {
      outsider,
      minter,
      artist,
      entitlement,
      makeVotingEligible,
    } = await loadFixture(deploySystemFixture);
    const design = await makeVotingEligible("ipfs://not-approved");
    await expect(
      entitlement
        .connect(outsider)
        .mint(artist.address, design.designId, design.designId, 1n, design.metadataURI)
    )
      .to.be.revertedWithCustomError(entitlement, "UnauthorizedMinter")
      .withArgs(outsider.address);
    await expect(
      entitlement
        .connect(minter)
        .mint(artist.address, design.designId, design.designId, 1n, design.metadataURI)
    ).to.be.revertedWith("SkinEntitlement1155: not technically approved");
  });

  it("mints tokenId equal to designId, locks URI, and enforces max supply", async function () {
    const { minter, buyerA, entitlement, prepareMarketReady } = await loadFixture(
      deploySystemFixture
    );
    const design = await prepareMarketReady({ roundId: 60n, maxSupply: 2n });
    await expect(
      entitlement
        .connect(minter)
        .mint(buyerA.address, design.designId, design.designId, 1n, design.metadataURI)
    )
      .to.emit(entitlement, "EntitlementMinted")
      .withArgs(design.designId, design.designId, buyerA.address, 1n);
    expect(await entitlement.uri(design.designId)).to.equal(design.metadataURI);
    expect(await entitlement["totalSupply(uint256)"](design.designId)).to.equal(1n);
    expect(await entitlement.isTransferable(design.designId)).to.equal(true);
    await expect(
      entitlement
        .connect(minter)
        .mint(buyerA.address, design.designId, design.designId, 1n, "ipfs://different")
    ).to.be.revertedWith("SkinEntitlement1155: URI mismatch");
    await entitlement
      .connect(minter)
      .mint(buyerA.address, design.designId, design.designId, 1n, design.metadataURI);
    await expect(
      entitlement
        .connect(minter)
        .mint(buyerA.address, design.designId, design.designId, 1n, design.metadataURI)
    )
      .to.be.revertedWithCustomError(entitlement, "SupplyCapExceeded")
      .withArgs(design.designId, 2n);
  });

  it("rejects token/design mismatch and suspended designs", async function () {
    const {
      minter,
      buyerA,
      assetRegistry,
      entitlement,
      prepareMarketReady,
    } = await loadFixture(deploySystemFixture);
    const design = await prepareMarketReady({ roundId: 61n });
    await expect(
      entitlement
        .connect(minter)
        .mint(buyerA.address, design.designId, design.designId + 1n, 1n, design.metadataURI)
    ).to.be.revertedWith("SkinEntitlement1155: token/design mismatch");
    await assetRegistry.suspendDesign(design.designId, hash("suspend"));
    await expect(
      entitlement
        .connect(minter)
        .mint(buyerA.address, design.designId, design.designId, 1n, design.metadataURI)
    ).to.be.revertedWith("SkinEntitlement1155: design suspended");
  });

  it("always disables direct single and batch transfer, even for approved operators", async function () {
    const { minter, buyerA, buyerB, outsider, entitlement, prepareMarketReady } =
      await loadFixture(deploySystemFixture);
    const design = await prepareMarketReady({ roundId: 62n });
    await entitlement
      .connect(minter)
      .mint(buyerA.address, design.designId, design.designId, 1n, design.metadataURI);
    await entitlement.connect(buyerA).setApprovalForAll(outsider.address, true);
    expect(await entitlement.isApprovedForAll(buyerA.address, outsider.address)).to.equal(true);
    await expect(
      entitlement
        .connect(outsider)
        .safeTransferFrom(buyerA.address, buyerB.address, design.designId, 1n, "0x")
    ).to.be.revertedWithCustomError(entitlement, "DirectTransferDisabled");
    await expect(
      entitlement
        .connect(buyerA)
        .safeBatchTransferFrom(
          buyerA.address,
          buyerB.address,
          [design.designId],
          [1n],
          "0x"
        )
    ).to.be.revertedWithCustomError(entitlement, "DirectTransferDisabled");
  });

  it("supports only the authorized marketplace path and transferability gate", async function () {
    const { minter, buyerA, buyerB, outsider, entitlement, prepareMarketReady } =
      await loadFixture(deploySystemFixture);
    const design = await prepareMarketReady({ roundId: 63n });
    await entitlement
      .connect(minter)
      .mint(buyerA.address, design.designId, design.designId, 1n, design.metadataURI);
    await expect(
      entitlement
        .connect(outsider)
        .authorisedTransfer(
          buyerA.address,
          buyerB.address,
          design.designId,
          design.designId,
          1n
        )
    )
      .to.be.revertedWithCustomError(entitlement, "UnauthorizedMarketplace")
      .withArgs(outsider.address);
    await entitlement.setMarketplaceAuthorization(outsider.address, true);
    await entitlement.setTransferable(design.designId, false);
    await expect(
      entitlement
        .connect(outsider)
        .authorisedTransfer(
          buyerA.address,
          buyerB.address,
          design.designId,
          design.designId,
          1n
        )
    ).to.be.revertedWith("SkinEntitlement1155: non-transferable");
    await entitlement.setTransferable(design.designId, true);
    await expect(
      entitlement
        .connect(outsider)
        .authorisedTransfer(
          buyerA.address,
          buyerB.address,
          design.designId,
          design.designId,
          1n
        )
    )
      .to.emit(entitlement, "EntitlementTransferred")
      .withArgs(design.designId, design.designId, buyerA.address, buyerB.address, 1n);
    expect(await entitlement.balanceOf(buyerA.address, design.designId)).to.equal(0n);
    expect(await entitlement.balanceOf(buyerB.address, design.designId)).to.equal(1n);
  });

  it("pauses mint and marketplace transfer and restores operation after unpause", async function () {
    const { minter, buyerA, buyerB, outsider, entitlement, prepareMarketReady } =
      await loadFixture(deploySystemFixture);
    const design = await prepareMarketReady({ roundId: 64n, maxSupply: 2n });
    await entitlement
      .connect(minter)
      .mint(buyerA.address, design.designId, design.designId, 1n, design.metadataURI);
    await entitlement.setMarketplaceAuthorization(outsider.address, true);
    await entitlement.pause();
    await expect(
      entitlement
        .connect(minter)
        .mint(buyerA.address, design.designId, design.designId, 1n, design.metadataURI)
    ).to.be.revertedWithCustomError(entitlement, "EntitlementPaused");
    await expect(
      entitlement
        .connect(outsider)
        .authorisedTransfer(
          buyerA.address,
          buyerB.address,
          design.designId,
          design.designId,
          1n
        )
    ).to.be.revertedWithCustomError(entitlement, "EntitlementPaused");
    await entitlement.unpause();
    await entitlement
      .connect(outsider)
      .authorisedTransfer(
        buyerA.address,
        buyerB.address,
        design.designId,
        design.designId,
        1n
      );
    expect(await entitlement["totalSupply(uint256)"](design.designId)).to.equal(1n);
  });

  it("reports ERC1155, ERC1155MetadataURI and AccessControl interfaces", async function () {
    const { entitlement } = await loadFixture(deploySystemFixture);
    expect(await entitlement.supportsInterface("0xd9b67a26")).to.equal(true);
    expect(await entitlement.supportsInterface("0x0e89341c")).to.equal(true);
    expect(await entitlement.supportsInterface("0x7965db0b")).to.equal(true);
    expect(await entitlement.supportsInterface("0xffffffff")).to.equal(false);
  });
});
