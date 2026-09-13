const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const { deploySystemFixture, hash } = require("./fixtures/system");

describe("CompatibilityRegistry", function () {
  it("rejects a zero registry and grants operational roles separately", async function () {
    const { admin, publisher, gameDeveloper, compatibility } = await loadFixture(
      deploySystemFixture
    );
    const Factory = await ethers.getContractFactory("CompatibilityRegistry");
    await expect(Factory.deploy(ethers.ZeroAddress)).to.be.revertedWith(
      "CompatibilityRegistry: zero registry"
    );
    expect(
      await compatibility.hasRole(await compatibility.DEFAULT_ADMIN_ROLE(), admin.address)
    ).to.equal(true);
    expect(
      await compatibility.hasRole(await compatibility.PUBLISHER_ROLE(), publisher.address)
    ).to.equal(true);
    expect(
      await compatibility.hasRole(
        await compatibility.GAME_DEVELOPER_ROLE(),
        gameDeveloper.address
      )
    ).to.equal(true);
  });

  it("requires agreement, evidence and publisher authorization for first submission", async function () {
    const { outsider, publisher, compatibility } = await loadFixture(
      deploySystemFixture
    );
    await expect(
      compatibility
        .connect(outsider)
        .submitProduction(1n, hash("p"), hash("c"), "1.0")
    ).to.be.revertedWithCustomError(compatibility, "UnauthorizedRole");
    await expect(
      compatibility
        .connect(publisher)
        .submitProduction(1n, hash("p"), hash("c"), "1.0")
    )
      .to.be.revertedWithCustomError(compatibility, "MissingAgreement")
      .withArgs(1n);
  });

  it("creates Pending, rejects overwrite, and approves exact evidence and cap", async function () {
    const {
      publisher,
      gameDeveloper,
      compatibility,
      makeVotingEligible,
      electWinner,
      recordAgreement,
    } = await loadFixture(deploySystemFixture);
    const design = await makeVotingEligible("ipfs://pending-approval");
    await electWinner([design.designId], 50n);
    await recordAgreement(design.designId);
    const productionHash = hash("production");
    const compatibilityHash = hash("compatibility");
    await compatibility
      .connect(publisher)
      .submitProduction(design.designId, productionHash, compatibilityHash, "1.0");
    const record = await compatibility.getProduction(design.designId);
    expect(record.qaStatus).to.equal(1n);
    expect(record.productionHash).to.equal(productionHash);
    expect(record.compatibilityHash).to.equal(compatibilityHash);
    await compatibility
      .connect(gameDeveloper)
      .approveCompatibility(design.designId, hash("game"), 10n);
    const approved = await compatibility.getProduction(design.designId);
    expect(approved.qaStatus).to.equal(2n);
    expect(approved.maxSupply).to.equal(10n);
    await expect(
      compatibility
        .connect(publisher)
        .submitProduction(design.designId, hash("new"), hash("new-c"), "2.0")
    ).to.be.revertedWith("CompatibilityRegistry: invalid submission state");
    await expect(
      compatibility
        .connect(gameDeveloper)
        .approveCompatibility(design.designId, hash("again"), 1n)
    ).to.be.revertedWith("CompatibilityRegistry: invalid approval state");
  });

  it("validates game hash and positive max supply before approval", async function () {
    const {
      publisher,
      gameDeveloper,
      compatibility,
      makeVotingEligible,
      electWinner,
      recordAgreement,
    } = await loadFixture(deploySystemFixture);
    const { designId } = await makeVotingEligible("ipfs://approval-validation");
    await electWinner([designId], 51n);
    await recordAgreement(designId);
    for (const [productionHash, compatibilityHash, version, message] of [
      [ethers.ZeroHash, hash("compatibility"), "1.0", "CompatibilityRegistry: zero production hash"],
      [hash("production"), ethers.ZeroHash, "1.0", "CompatibilityRegistry: zero compatibility hash"],
      [hash("production"), hash("compatibility"), "", "CompatibilityRegistry: empty version"],
    ]) {
      await expect(
        compatibility
          .connect(publisher)
          .submitProduction(designId, productionHash, compatibilityHash, version)
      ).to.be.revertedWith(message);
    }
    await compatibility
      .connect(publisher)
      .submitProduction(designId, hash("production"), hash("compatibility"), "1.0");
    await expect(
      compatibility
        .connect(gameDeveloper)
        .approveCompatibility(designId, ethers.ZeroHash, 1n)
    ).to.be.revertedWith("CompatibilityRegistry: zero game hash");
    await expect(
      compatibility
        .connect(gameDeveloper)
        .approveCompatibility(designId, hash("game"), 0n)
    )
      .to.be.revertedWithCustomError(compatibility, "InvalidMaxSupply")
      .withArgs(0n);
  });

  it("supports rework while suspended but blocks resubmission until reinstated", async function () {
    const {
      publisher,
      gameDeveloper,
      assetRegistry,
      compatibility,
      makeVotingEligible,
      electWinner,
      recordAgreement,
    } = await loadFixture(deploySystemFixture);
    const { designId } = await makeVotingEligible("ipfs://rework");
    await electWinner([designId], 52n);
    await recordAgreement(designId);
    const productionHash = hash("original-production");
    const compatibilityHash = hash("original-compatibility");
    await compatibility
      .connect(publisher)
      .submitProduction(designId, productionHash, compatibilityHash, "1.0");
    await assetRegistry.suspendDesign(designId, hash("pause"));
    await expect(
      compatibility
        .connect(gameDeveloper)
        .approveCompatibility(designId, hash("blocked-game"), 10n)
    )
      .to.be.revertedWithCustomError(compatibility, "DesignIsSuspended")
      .withArgs(designId);
    await compatibility.connect(gameDeveloper).requireRework(designId, hash("reason"));
    const rework = await compatibility.getProduction(designId);
    expect(rework.productionHash).to.equal(productionHash);
    expect(rework.compatibilityHash).to.equal(compatibilityHash);
    expect(rework.qaStatus).to.equal(3n);
    await expect(
      compatibility
        .connect(publisher)
        .submitProduction(designId, hash("next-p"), hash("next-c"), "2.0")
    )
      .to.be.revertedWithCustomError(compatibility, "DesignIsSuspended")
      .withArgs(designId);
    await assetRegistry.reinstateDesign(designId);
    await compatibility
      .connect(publisher)
      .submitProduction(designId, hash("next-p"), hash("next-c"), "2.0");
    const resubmitted = await compatibility.getProduction(designId);
    expect(resubmitted.qaStatus).to.equal(1n);
    expect(resubmitted.approvedGameHash).to.equal(ethers.ZeroHash);
    expect(resubmitted.maxSupply).to.equal(0n);
  });

  it("returns safe missing views and the frozen missing-record error", async function () {
    const { compatibility } = await loadFixture(deploySystemFixture);
    expect(await compatibility.isTechnicallyApproved(999n)).to.equal(false);
    expect(await compatibility.getMaxSupply(999n)).to.equal(0n);
    await expect(compatibility.getProduction(999n))
      .to.be.revertedWithCustomError(compatibility, "ProductionNotFound")
      .withArgs(999n);
  });
});
