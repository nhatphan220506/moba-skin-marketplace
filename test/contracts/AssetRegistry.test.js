const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const { deploySystemFixture, hash } = require("./fixtures/system");

describe("AssetRegistry", function () {
  it("starts IDs at one, stores evidence, and enforces artist authorization", async function () {
    const { artist, outsider, assetRegistry, submitDesign } = await loadFixture(
      deploySystemFixture
    );
    const artistRole = await assetRegistry.ARTIST_ROLE();
    await expect(
      assetRegistry
        .connect(outsider)
        .submitDesign("ipfs://x", hash("a"), hash("b"), hash("c"))
    )
      .to.be.revertedWithCustomError(assetRegistry, "UnauthorizedRole")
      .withArgs(artistRole, outsider.address);

    const submitted = await submitDesign("ipfs://asset-one");
    const record = await assetRegistry.getDesign(1n);
    expect(submitted.designId).to.equal(1n);
    expect(record.creator).to.equal(artist.address);
    expect(record.metadataURI).to.equal("ipfs://asset-one");
    expect(record.artworkHash).to.equal(submitted.artworkHash);
    expect(record.status).to.equal(1n);
    expect(record.verified).to.equal(false);
  });

  it("rejects empty metadata and every required zero evidence hash", async function () {
    const { artist, assetRegistry } = await loadFixture(deploySystemFixture);
    const valid = hash("valid");
    for (const [metadataURI, artworkHash, aiHash, provenanceHash, message] of [
      ["", valid, valid, valid, "AssetRegistry: empty metadata URI"],
      ["ipfs://x", ethers.ZeroHash, valid, valid, "AssetRegistry: empty artwork hash"],
      ["ipfs://x", valid, ethers.ZeroHash, valid, "AssetRegistry: empty AI disclosure hash"],
      ["ipfs://x", valid, valid, ethers.ZeroHash, "AssetRegistry: empty provenance hash"],
    ]) {
      await expect(
        assetRegistry
          .connect(artist)
          .submitDesign(metadataURI, artworkHash, aiHash, provenanceHash)
      ).to.be.revertedWith(message);
    }
  });

  it("enforces verification and publisher lifecycle transitions", async function () {
    const { verifier, publisher, outsider, assetRegistry, submitDesign } =
      await loadFixture(deploySystemFixture);
    const { designId } = await submitDesign("ipfs://lifecycle");
    await expect(assetRegistry.connect(outsider).verifyDesign(designId, hash("r")))
      .to.be.revertedWithCustomError(assetRegistry, "UnauthorizedRole")
      .withArgs(await assetRegistry.VERIFIER_ROLE(), outsider.address);
    await expect(assetRegistry.connect(verifier).verifyDesign(designId, hash("report")))
      .to.emit(assetRegistry, "DesignVerified")
      .withArgs(designId, verifier.address, hash("report"));
    await expect(
      assetRegistry
        .connect(publisher)
        .approveConceptEligibility(designId, hash("review"))
    )
      .to.emit(assetRegistry, "ConceptEligibilityUpdated")
      .withArgs(designId, publisher.address, true, hash("review"));
    expect(await assetRegistry.isVerified(designId)).to.equal(true);
    expect(await assetRegistry.isPublisherEligible(designId)).to.equal(true);
    expect((await assetRegistry.getDesign(designId)).status).to.equal(5n);
  });

  it("allows revision only from Submitted and blocks invalid transitions", async function () {
    const { verifier, assetRegistry, submitDesign } = await loadFixture(
      deploySystemFixture
    );
    const { designId } = await submitDesign("ipfs://revision");
    await expect(assetRegistry.connect(verifier).requestRevision(designId, hash("reason")))
      .to.emit(assetRegistry, "DesignRevisionRequested")
      .withArgs(designId, hash("reason"));
    await expect(assetRegistry.connect(verifier).verifyDesign(designId, hash("report")))
      .to.be.revertedWithCustomError(assetRegistry, "InvalidStateTransition")
      .withArgs(designId, 2n, 3n);
  });

  it("configures CommunityVoting once and rejects zero or replacement addresses", async function () {
    const [admin, outsider] = await ethers.getSigners();
    const AssetRegistry = await ethers.getContractFactory("AssetRegistry");
    const isolated = await AssetRegistry.deploy();
    await expect(isolated.setCommunityVoting(ethers.ZeroAddress))
      .to.be.revertedWithCustomError(isolated, "InvalidContractAddress")
      .withArgs(ethers.ZeroAddress);
    await expect(isolated.connect(outsider).setCommunityVoting(admin.address)).to.be
      .revertedWithCustomError(isolated, "UnauthorizedRole");
    await isolated.setCommunityVoting(admin.address);
    await expect(isolated.setCommunityVoting(outsider.address))
      .to.be.revertedWithCustomError(isolated, "DependencyAlreadyConfigured")
      .withArgs(admin.address);
  });

  it("records exact commercial terms only for a voting winner", async function () {
    const {
      publisher,
      assetRegistry,
      makeVotingEligible,
      electWinner,
    } = await loadFixture(deploySystemFixture);
    const { designId } = await makeVotingEligible("ipfs://agreement");
    await expect(
      assetRegistry
        .connect(publisher)
        .recordAgreement(designId, hash("agreement"), 8_000, 500)
    ).to.be.revertedWithCustomError(assetRegistry, "InvalidStateTransition");
    await electWinner([designId], 20n);
    await expect(
      assetRegistry
        .connect(publisher)
        .recordAgreement(designId, hash("agreement"), 7_999, 500)
    )
      .to.be.revertedWithCustomError(assetRegistry, "InvalidBpsTotal")
      .withArgs(9_999n);
    expect(await assetRegistry.hasAgreement(designId)).to.equal(false);
    await assetRegistry
      .connect(publisher)
      .recordAgreement(designId, hash("agreement"), 8_000, 500);
    const terms = await assetRegistry.getCommercialTerms(designId);
    expect(terms.artistPrimaryShareBps).to.equal(8_000n);
    expect(terms.artistResaleRoyaltyBps).to.equal(500n);
    expect(terms.recorded).to.equal(true);
  });

  it("suspends and reinstates without losing evidence or terms", async function () {
    const { assetRegistry, prepareMarketReady } = await loadFixture(
      deploySystemFixture
    );
    const { designId, artworkHash } = await prepareMarketReady({ roundId: 30n });
    const before = await assetRegistry.getDesign(designId);
    const termsBefore = await assetRegistry.getCommercialTerms(designId);
    await assetRegistry.suspendDesign(designId, hash("suspension"));
    expect(await assetRegistry.isSuspended(designId)).to.equal(true);
    expect((await assetRegistry.getDesign(designId)).status).to.equal(14n);
    await assetRegistry.reinstateDesign(designId);
    const after = await assetRegistry.getDesign(designId);
    const termsAfter = await assetRegistry.getCommercialTerms(designId);
    expect(after.status).to.equal(before.status);
    expect(after.artworkHash).to.equal(artworkHash);
    expect(after.verificationReportHash).to.equal(before.verificationReportHash);
    expect(after.agreementHash).to.equal(before.agreementHash);
    expect(termsAfter.artistPrimaryShareBps).to.equal(
      termsBefore.artistPrimaryShareBps
    );
  });

  it("uses the frozen missing-design error across getters", async function () {
    const { assetRegistry } = await loadFixture(deploySystemFixture);
    await expect(assetRegistry.getDesign(999n))
      .to.be.revertedWithCustomError(assetRegistry, "DesignNotFound")
      .withArgs(999n);
    await expect(assetRegistry.isVerified(999n))
      .to.be.revertedWithCustomError(assetRegistry, "DesignNotFound")
      .withArgs(999n);
  });
});
