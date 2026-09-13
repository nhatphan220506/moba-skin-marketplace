const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture, time } = require("@nomicfoundation/hardhat-network-helpers");
const { deploySystemFixture, hash } = require("./fixtures/system");

describe("PrimaryAuction", function () {
  it("rejects zero constructor dependencies and grants publisher separately", async function () {
    const {
      admin,
      publisher,
      publisherTreasury,
      marketplaceTreasury,
      assetRegistry,
      voting,
      compatibility,
      payment,
      entitlement,
      primary,
    } = await loadFixture(deploySystemFixture);
    const Factory = await ethers.getContractFactory("PrimaryAuction");
    const valid = [
      await assetRegistry.getAddress(),
      await voting.getAddress(),
      await compatibility.getAddress(),
      await payment.getAddress(),
      await entitlement.getAddress(),
      publisherTreasury.address,
      marketplaceTreasury.address,
    ];
    const messages = [
      "PrimaryAuction: zero asset registry",
      "PrimaryAuction: zero voting registry",
      "PrimaryAuction: zero compatibility registry",
      "PrimaryAuction: zero payment token",
      "PrimaryAuction: zero entitlement",
      "PrimaryAuction: zero publisher treasury",
      "PrimaryAuction: zero marketplace treasury",
    ];
    for (let index = 0; index < valid.length; index += 1) {
      const args = [...valid];
      args[index] = ethers.ZeroAddress;
      await expect(Factory.deploy(...args)).to.be.revertedWith(messages[index]);
    }
    expect(await primary.hasRole(await primary.DEFAULT_ADMIN_ROLE(), admin.address)).to.equal(true);
    expect(await primary.hasRole(await primary.PUBLISHER_ROLE(), publisher.address)).to.equal(true);
    expect(await assetRegistry.getAddress()).not.to.equal(ethers.ZeroAddress);
  });

  it("requires publisher authorization and every market-ready gate", async function () {
    const { outsider, publisher, primary, makeVotingEligible } = await loadFixture(
      deploySystemFixture
    );
    const { designId } = await makeVotingEligible("ipfs://not-market-ready");
    const now = await time.latest();
    await expect(primary.connect(outsider).createAuction(designId, 100n, 10n, now + 2, now + 20))
      .to.be.revertedWithCustomError(primary, "UnauthorizedRole")
      .withArgs(await primary.PUBLISHER_ROLE(), outsider.address);
    await expect(primary.connect(publisher).createAuction(designId, 100n, 10n, now + 2, now + 20))
      .to.be.revertedWithCustomError(primary, "NotMarketReady")
      .withArgs(designId);
  });

  it("validates auction parameters and rejects duplicate active auctions", async function () {
    const { publisher, primary, prepareMarketReady, createAuction } = await loadFixture(
      deploySystemFixture
    );
    const { designId } = await prepareMarketReady({ roundId: 70n });
    const now = await time.latest();
    await expect(primary.connect(publisher).createAuction(designId, 0n, 10n, now + 2, now + 20)).to.be
      .revertedWith("PrimaryAuction: zero reserve");
    await expect(primary.connect(publisher).createAuction(designId, 100n, 0n, now + 2, now + 20)).to.be
      .revertedWith("PrimaryAuction: zero increment");
    await expect(primary.connect(publisher).createAuction(designId, 100n, 10n, now + 20, now + 2)).to.be
      .revertedWith("PrimaryAuction: invalid window");
    await createAuction(designId);
    await expect(primary.connect(publisher).createAuction(designId, 100n, 10n, now + 3, now + 30)).to.be
      .revertedWith("PrimaryAuction: active auction exists");
  });

  it("enforces bid window, creator exclusion, and minimum increments while allowing below reserve", async function () {
    const {
      artist,
      buyerA,
      buyerB,
      payment,
      primary,
      prepareMarketReady,
      createAuction,
    } = await loadFixture(deploySystemFixture);
    const { designId } = await prepareMarketReady({ roundId: 71n });
    const now = await time.latest();
    const auction = await createAuction(designId, {
      reservePrice: 100n,
      minimumIncrement: 10n,
      startTime: now + 20,
      endTime: now + 60,
    });
    await expect(primary.connect(buyerA).placeBid(auction.auctionId, 50n))
      .to.be.revertedWithCustomError(primary, "AuctionNotActive")
      .withArgs(auction.auctionId);
    await time.increaseTo(auction.startTime);
    await payment.mint(artist.address, 200n);
    await payment.connect(artist).approve(await primary.getAddress(), 200n);
    await expect(primary.connect(artist).placeBid(auction.auctionId, 50n))
      .to.be.revertedWithCustomError(primary, "CreatorCannotBid")
      .withArgs(artist.address);
    await expect(primary.connect(buyerA).placeBid(auction.auctionId, 9n))
      .to.be.revertedWithCustomError(primary, "BidBelowMinimum")
      .withArgs(10n, 9n);
    await expect(primary.connect(buyerA).placeBid(auction.auctionId, 50n))
      .to.emit(primary, "BidPlaced")
      .withArgs(auction.auctionId, buyerA.address, 50n);
    await expect(primary.connect(buyerB).placeBid(auction.auctionId, 59n))
      .to.be.revertedWithCustomError(primary, "BidBelowMinimum")
      .withArgs(60n, 59n);
    await time.increaseTo(auction.endTime);
    await expect(primary.connect(buyerB).placeBid(auction.auctionId, 60n))
      .to.be.revertedWithCustomError(primary, "AuctionNotActive")
      .withArgs(auction.auctionId);
  });

  it("uses full-value escrow for outbids, including a bidder outbidding itself", async function () {
    const { buyerA, buyerB, payment, primary, prepareMarketReady, createAuction } =
      await loadFixture(deploySystemFixture);
    const { designId } = await prepareMarketReady({ roundId: 72n });
    const auction = await createAuction(designId);
    await time.increaseTo(auction.startTime);
    await primary.connect(buyerA).placeBid(auction.auctionId, 50n);
    await primary.connect(buyerB).placeBid(auction.auctionId, 70n);
    expect(await primary.pendingReturns(auction.auctionId, buyerA.address)).to.equal(50n);
    await primary.connect(buyerB).placeBid(auction.auctionId, 90n);
    expect(await primary.pendingReturns(auction.auctionId, buyerB.address)).to.equal(70n);
    expect(await payment.balanceOf(await primary.getAddress())).to.equal(210n);
    expect((await primary.getAuction(auction.auctionId)).highestBid).to.equal(90n);
  });

  it("withdraws pull refunds exactly once and zeroes accounting before transfer", async function () {
    const { buyerA, buyerB, payment, primary, prepareMarketReady, createAuction } =
      await loadFixture(deploySystemFixture);
    const { designId } = await prepareMarketReady({ roundId: 73n });
    const auction = await createAuction(designId);
    await time.increaseTo(auction.startTime);
    await primary.connect(buyerA).placeBid(auction.auctionId, 50n);
    await primary.connect(buyerB).placeBid(auction.auctionId, 100n);
    await expect(primary.connect(buyerA).withdrawRefund(auction.auctionId))
      .to.emit(primary, "RefundWithdrawn")
      .withArgs(auction.auctionId, buyerA.address, 50n);
    expect(await primary.pendingReturns(auction.auctionId, buyerA.address)).to.equal(0n);
    expect(await payment.balanceOf(buyerA.address)).to.equal(10_000n);
    await expect(primary.connect(buyerA).withdrawRefund(auction.auctionId))
      .to.be.revertedWithCustomError(primary, "NothingToWithdraw")
      .withArgs(buyerA.address);
  });

  it("settles sold permissionlessly, mints once, and allocates exact primary proceeds", async function () {
    const {
      artist,
      buyerA,
      outsider,
      publisherTreasury,
      marketplaceTreasury,
      entitlement,
      primary,
      prepareMarketReady,
      createAuction,
    } = await loadFixture(deploySystemFixture);
    const design = await prepareMarketReady({ roundId: 74n });
    const auction = await createAuction(design.designId);
    await time.increaseTo(auction.startTime);
    await primary.connect(buyerA).placeBid(auction.auctionId, 150n);
    await expect(primary.connect(outsider).settle(auction.auctionId)).to.be.revertedWithCustomError(
      primary,
      "AuctionStillOpen"
    );
    await time.increaseTo(auction.endTime);
    await expect(primary.connect(outsider).settle(auction.auctionId))
      .to.emit(primary, "AuctionSettled")
      .withArgs(auction.auctionId, design.designId, buyerA.address, 150n);
    expect((await primary.getAuction(auction.auctionId)).status).to.equal(3n);
    expect(await primary.pendingProceeds(artist.address)).to.equal(120n);
    expect(await primary.pendingProceeds(publisherTreasury.address)).to.equal(15n);
    expect(await primary.pendingProceeds(marketplaceTreasury.address)).to.equal(15n);
    expect(await entitlement.balanceOf(buyerA.address, design.designId)).to.equal(1n);
    expect(await entitlement["totalSupply(uint256)"](design.designId)).to.equal(1n);
    await expect(primary.settle(auction.auctionId))
      .to.be.revertedWithCustomError(primary, "AlreadySettled")
      .withArgs(auction.auctionId);
  });

  it("closes reserve misses as Unsold, refunds the bid, and allocates no proceeds", async function () {
    const {
      artist,
      buyerA,
      publisherTreasury,
      marketplaceTreasury,
      entitlement,
      primary,
      prepareMarketReady,
      createAuction,
    } = await loadFixture(deploySystemFixture);
    const design = await prepareMarketReady({ roundId: 75n });
    const auction = await createAuction(design.designId, { reservePrice: 100n });
    await time.increaseTo(auction.startTime);
    await primary.connect(buyerA).placeBid(auction.auctionId, 80n);
    await time.increaseTo(auction.endTime);
    await expect(primary.settle(auction.auctionId))
      .to.emit(primary, "AuctionClosedUnsold")
      .withArgs(auction.auctionId, design.designId, buyerA.address, 80n);
    expect((await primary.getAuction(auction.auctionId)).status).to.equal(4n);
    expect(await primary.pendingReturns(auction.auctionId, buyerA.address)).to.equal(80n);
    expect(await primary.pendingProceeds(artist.address)).to.equal(0n);
    expect(await primary.pendingProceeds(publisherTreasury.address)).to.equal(0n);
    expect(await primary.pendingProceeds(marketplaceTreasury.address)).to.equal(0n);
    expect(await entitlement["totalSupply(uint256)"](design.designId)).to.equal(0n);
  });

  it("cancels by authority even while suspended and preserves the highest bid as a refund", async function () {
    const {
      buyerA,
      outsider,
      assetRegistry,
      primary,
      prepareMarketReady,
      createAuction,
    } = await loadFixture(deploySystemFixture);
    const design = await prepareMarketReady({ roundId: 76n });
    const auction = await createAuction(design.designId);
    await time.increaseTo(auction.startTime);
    await primary.connect(buyerA).placeBid(auction.auctionId, 100n);
    await assetRegistry.suspendDesign(design.designId, hash("emergency"));
    await expect(primary.connect(outsider).cancelAuction(auction.auctionId)).to.be.revertedWithCustomError(
      primary,
      "UnauthorizedRole"
    );
    await primary.cancelAuction(auction.auctionId);
    expect((await primary.getAuction(auction.auctionId)).status).to.equal(5n);
    expect(await primary.pendingReturns(auction.auctionId, buyerA.address)).to.equal(100n);
  });

  it("rolls back settlement and accounting atomically when entitlement mint fails", async function () {
    const {
      artist,
      buyerA,
      publisherTreasury,
      marketplaceTreasury,
      entitlement,
      primary,
      prepareMarketReady,
      createAuction,
    } = await loadFixture(deploySystemFixture);
    const design = await prepareMarketReady({ roundId: 77n });
    const auction = await createAuction(design.designId);
    await time.increaseTo(auction.startTime);
    await primary.connect(buyerA).placeBid(auction.auctionId, 150n);
    await entitlement.pause();
    await time.increaseTo(auction.endTime);
    await expect(primary.settle(auction.auctionId)).to.be.revertedWithCustomError(
      entitlement,
      "EntitlementPaused"
    );
    expect((await primary.getAuction(auction.auctionId)).status).to.equal(2n);
    expect(await primary.pendingProceeds(artist.address)).to.equal(0n);
    expect(await primary.pendingProceeds(publisherTreasury.address)).to.equal(0n);
    expect(await primary.pendingProceeds(marketplaceTreasury.address)).to.equal(0n);
    expect(await entitlement["totalSupply(uint256)"](design.designId)).to.equal(0n);
  });

  it("withdraws each proceeds allocation exactly once", async function () {
    const {
      artist,
      buyerA,
      publisherTreasury,
      marketplaceTreasury,
      payment,
      primary,
      prepareMarketReady,
      createAuction,
    } = await loadFixture(deploySystemFixture);
    const design = await prepareMarketReady({ roundId: 78n });
    const auction = await createAuction(design.designId);
    await time.increaseTo(auction.startTime);
    await primary.connect(buyerA).placeBid(auction.auctionId, 150n);
    await time.increaseTo(auction.endTime);
    await primary.settle(auction.auctionId);
    for (const [account, amount] of [
      [artist, 120n],
      [publisherTreasury, 15n],
      [marketplaceTreasury, 15n],
    ]) {
      const before = await payment.balanceOf(account.address);
      await primary.connect(account).withdrawProceeds();
      expect(await payment.balanceOf(account.address)).to.equal(before + amount);
      await expect(primary.connect(account).withdrawProceeds())
        .to.be.revertedWithCustomError(primary, "NothingToWithdraw")
        .withArgs(account.address);
    }
    expect(await payment.balanceOf(await primary.getAddress())).to.equal(0n);
  });
});
