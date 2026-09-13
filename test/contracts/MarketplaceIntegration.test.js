const { expect } = require("chai");
const { loadFixture, time } = require("@nomicfoundation/hardhat-network-helpers");
const { deploySystemFixture, hash } = require("./fixtures/system");

describe("Marketplace cross-contract integration", function () {
  it("executes the complete submit-to-auction-to-resale demo with conserved accounting", async function () {
    const {
      artist,
      verifier,
      publisher,
      gameDeveloper,
      fanA,
      fanB,
      buyerA,
      buyerB,
      buyerC,
      publisherTreasury,
      marketplaceTreasury,
      payment,
      assetRegistry,
      voting,
      compatibility,
      entitlement,
      primary,
      secondary,
      submitDesign,
      createAuction,
    } = await loadFixture(deploySystemFixture);

    const design = await submitDesign("ipfs://full-demo");
    await assetRegistry
      .connect(verifier)
      .verifyDesign(design.designId, hash("full:verification"));
    await assetRegistry
      .connect(publisher)
      .approveConceptEligibility(design.designId, hash("full:publisher"));

    let now = await time.latest();
    await voting.openVoting(100n, [design.designId], now + 2, now + 30);
    await time.increaseTo(now + 2);
    await voting.connect(fanA).vote(100n, design.designId);
    await voting.connect(fanB).vote(100n, design.designId);
    await time.increaseTo(now + 30);
    await voting.finalizeVoting(100n);
    expect(await voting.isVotingWinner(design.designId)).to.equal(true);

    await assetRegistry
      .connect(publisher)
      .recordAgreement(design.designId, hash("full:agreement"), 8_000, 500);
    await compatibility
      .connect(publisher)
      .submitProduction(
        design.designId,
        hash("full:production"),
        hash("full:compatibility"),
        "1.0.0"
      );
    await compatibility
      .connect(gameDeveloper)
      .approveCompatibility(design.designId, hash("full:game"), 10n);

    const auction = await createAuction(design.designId);
    await time.increaseTo(auction.startTime);
    await primary.connect(buyerA).placeBid(auction.auctionId, 120n);
    await primary.connect(buyerB).placeBid(auction.auctionId, 150n);
    expect(await primary.pendingReturns(auction.auctionId, buyerA.address)).to.equal(120n);
    expect(await payment.balanceOf(await primary.getAddress())).to.equal(270n);
    await time.increaseTo(auction.endTime);
    await primary.settle(auction.auctionId);

    expect(await primary.pendingProceeds(artist.address)).to.equal(120n);
    expect(await primary.pendingProceeds(publisherTreasury.address)).to.equal(15n);
    expect(await primary.pendingProceeds(marketplaceTreasury.address)).to.equal(15n);
    expect(await payment.balanceOf(await primary.getAddress())).to.equal(270n);
    expect(await entitlement.balanceOf(buyerB.address, design.designId)).to.equal(1n);
    expect(await entitlement["totalSupply(uint256)"](design.designId)).to.equal(1n);

    await secondary
      .connect(buyerB)
      .listForResale(design.designId, design.designId, 200n);
    await secondary.connect(buyerC).buyResale(1n);
    expect(await payment.balanceOf(await secondary.getAddress())).to.equal(200n);
    expect(await entitlement.balanceOf(buyerB.address, design.designId)).to.equal(0n);
    expect(await entitlement.balanceOf(buyerC.address, design.designId)).to.equal(1n);
    expect(await entitlement["totalSupply(uint256)"](design.designId)).to.equal(1n);

    const expectedWithdrawals = [
      [buyerA, primary, 120n],
      [artist, primary, 120n],
      [publisherTreasury, primary, 15n],
      [marketplaceTreasury, primary, 15n],
      [buyerB, secondary, 180n],
      [artist, secondary, 10n],
      [publisherTreasury, secondary, 6n],
      [marketplaceTreasury, secondary, 4n],
    ];
    for (const [account, market, amount] of expectedWithdrawals) {
      const before = await payment.balanceOf(account.address);
      const method = market === primary && account === buyerA
        ? primary.connect(account).withdrawRefund(auction.auctionId)
        : market.connect(account).withdrawProceeds();
      await method;
      expect(await payment.balanceOf(account.address)).to.equal(before + amount);
    }
    expect(await payment.balanceOf(await primary.getAddress())).to.equal(0n);
    expect(await payment.balanceOf(await secondary.getAddress())).to.equal(0n);
  });

  it("blocks agreement and market advancement before voting and technical approval", async function () {
    const {
      publisher,
      assetRegistry,
      primary,
      makeVotingEligible,
      electWinner,
      recordAgreement,
    } = await loadFixture(deploySystemFixture);
    const design = await makeVotingEligible("ipfs://gates");
    await expect(
      assetRegistry
        .connect(publisher)
        .recordAgreement(design.designId, hash("agreement"), 8_000, 500)
    ).to.be.revertedWithCustomError(assetRegistry, "InvalidStateTransition");
    await electWinner([design.designId], 101n);
    await recordAgreement(design.designId);
    const now = await time.latest();
    await expect(
      primary
        .connect(publisher)
        .createAuction(design.designId, 100n, 10n, now + 2, now + 20)
    )
      .to.be.revertedWithCustomError(primary, "NotMarketReady")
      .withArgs(design.designId);
  });

  it("preserves evidence while suspension blocks production, auction and resale advancement", async function () {
    const {
      buyerB,
      publisher,
      assetRegistry,
      compatibility,
      primary,
      secondary,
      minter,
      entitlement,
      prepareMarketReady,
    } = await loadFixture(deploySystemFixture);
    const design = await prepareMarketReady({ roundId: 102n, maxSupply: 3n });
    const before = await assetRegistry.getDesign(design.designId);
    const productionBefore = await compatibility.getProduction(design.designId);
    await entitlement
      .connect(minter)
      .mint(buyerB.address, design.designId, design.designId, 1n, design.metadataURI);
    await assetRegistry.suspendDesign(design.designId, hash("suspend"));
    const now = await time.latest();
    await expect(
      primary
        .connect(publisher)
        .createAuction(design.designId, 100n, 10n, now + 2, now + 20)
    )
      .to.be.revertedWithCustomError(primary, "DesignIsSuspended")
      .withArgs(design.designId);
    await expect(
      secondary.connect(buyerB).listForResale(design.designId, design.designId, 200n)
    )
      .to.be.revertedWithCustomError(secondary, "DesignIsSuspended")
      .withArgs(design.designId);
    const after = await assetRegistry.getDesign(design.designId);
    const productionAfter = await compatibility.getProduction(design.designId);
    expect(after.artworkHash).to.equal(before.artworkHash);
    expect(after.agreementHash).to.equal(before.agreementHash);
    expect(productionAfter.productionHash).to.equal(productionBefore.productionHash);
    expect(productionAfter.compatibilityHash).to.equal(
      productionBefore.compatibilityHash
    );
  });

  it("enforces the supply cap across sequential primary settlements", async function () {
    const {
      buyerA,
      buyerB,
      publisher,
      entitlement,
      primary,
      prepareMarketReady,
      createAuction,
    } = await loadFixture(deploySystemFixture);
    const design = await prepareMarketReady({ roundId: 103n, maxSupply: 1n });
    const first = await createAuction(design.designId);
    await time.increaseTo(first.startTime);
    await primary.connect(buyerA).placeBid(first.auctionId, 100n);
    await time.increaseTo(first.endTime);
    await primary.settle(first.auctionId);
    expect(await entitlement["totalSupply(uint256)"](design.designId)).to.equal(1n);
    const now = await time.latest();
    await expect(
      primary
        .connect(publisher)
        .createAuction(design.designId, 100n, 10n, now + 2, now + 20)
    )
      .to.be.revertedWithCustomError(primary, "NotMarketReady")
      .withArgs(design.designId);
  });
});
