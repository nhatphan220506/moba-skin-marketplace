const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture, time } = require("@nomicfoundation/hardhat-network-helpers");
const { deploySystemFixture } = require("./fixtures/system");

describe("CommunityVoting", function () {
  it("rejects a zero registry and grants only the deployer admin role", async function () {
    const { admin, fanA, voting } = await loadFixture(deploySystemFixture);
    const Factory = await ethers.getContractFactory("CommunityVoting");
    await expect(Factory.deploy(ethers.ZeroAddress)).to.be.revertedWith(
      "CommunityVoting: zero registry"
    );
    expect(await voting.hasRole(await voting.DEFAULT_ADMIN_ROLE(), admin.address)).to.equal(true);
    expect(await voting.hasRole(await voting.FAN_ROLE(), fanA.address)).to.equal(true);
  });

  it("allows only admin to open a non-empty, unique, eligible round", async function () {
    const { outsider, assetRegistry, voting, makeVotingEligible } = await loadFixture(
      deploySystemFixture
    );
    const { designId } = await makeVotingEligible("ipfs://vote-candidate");
    const now = await time.latest();
    await expect(voting.connect(outsider).openVoting(1n, [designId], now + 2, now + 20))
      .to.be.revertedWithCustomError(voting, "UnauthorizedRole")
      .withArgs(await voting.DEFAULT_ADMIN_ROLE(), outsider.address);
    await expect(voting.openVoting(1n, [], now + 2, now + 20)).to.be.revertedWith(
      "CommunityVoting: no candidates"
    );
    await expect(
      voting.openVoting(1n, [designId, designId], now + 2, now + 20)
    )
      .to.be.revertedWithCustomError(voting, "IneligibleCandidate")
      .withArgs(1n, designId);
    await expect(voting.openVoting(1n, [999n], now + 2, now + 20))
      .to.be.revertedWithCustomError(voting, "IneligibleCandidate")
      .withArgs(1n, 999n);
    await assetRegistry.suspendDesign(designId, ethers.keccak256(ethers.toUtf8Bytes("risk")));
    await expect(voting.openVoting(1n, [designId], now + 2, now + 20))
      .to.be.revertedWithCustomError(voting, "IneligibleCandidate")
      .withArgs(1n, designId);
    await expect(voting.openVoting(1n, [designId], now + 20, now + 2)).to.be.revertedWith(
      "CommunityVoting: invalid window"
    );
  });

  it("enforces the [startTime, endTime) window and FAN_ROLE", async function () {
    const { fanA, outsider, voting, makeVotingEligible } = await loadFixture(
      deploySystemFixture
    );
    const { designId } = await makeVotingEligible("ipfs://window");
    const now = await time.latest();
    const start = now + 20;
    const end = now + 40;
    await voting.openVoting(2n, [designId], start, end);
    await expect(voting.connect(fanA).vote(2n, designId))
      .to.be.revertedWithCustomError(voting, "VotingNotOpen")
      .withArgs(2n);
    await time.increaseTo(start);
    await expect(voting.connect(outsider).vote(2n, designId))
      .to.be.revertedWithCustomError(voting, "UnauthorizedRole")
      .withArgs(await voting.FAN_ROLE(), outsider.address);
    await expect(voting.connect(fanA).vote(2n, designId))
      .to.emit(voting, "VoteRecorded")
      .withArgs(2n, designId, fanA.address);
    await time.increaseTo(end);
    await expect(voting.connect(fanA).vote(2n, designId))
      .to.be.revertedWithCustomError(voting, "VotingNotOpen")
      .withArgs(2n);
  });

  it("allows one vote per wallet and rejects candidates outside the round", async function () {
    const { fanA, voting, makeVotingEligible } = await loadFixture(
      deploySystemFixture
    );
    const first = await makeVotingEligible("ipfs://first");
    const second = await makeVotingEligible("ipfs://second");
    const now = await time.latest();
    await voting.openVoting(3n, [first.designId], now + 2, now + 40);
    await time.increaseTo(now + 2);
    await expect(voting.connect(fanA).vote(3n, second.designId))
      .to.be.revertedWithCustomError(voting, "IneligibleCandidate")
      .withArgs(3n, second.designId);
    await voting.connect(fanA).vote(3n, first.designId);
    await expect(voting.connect(fanA).vote(3n, first.designId))
      .to.be.revertedWithCustomError(voting, "AlreadyVoted")
      .withArgs(3n, fanA.address);
    expect(await voting.hasVoted(3n, fanA.address)).to.equal(true);
    expect(await voting.voteCount(3n, first.designId)).to.equal(1n);
  });

  it("finalizes permissionlessly only through admin after end and only once", async function () {
    const { outsider, fanA, voting, makeVotingEligible } = await loadFixture(
      deploySystemFixture
    );
    const { designId } = await makeVotingEligible("ipfs://finalize");
    const now = await time.latest();
    await voting.openVoting(4n, [designId], now + 2, now + 20);
    await time.increaseTo(now + 2);
    await voting.connect(fanA).vote(4n, designId);
    await expect(voting.finalizeVoting(4n))
      .to.be.revertedWithCustomError(voting, "VotingStillOpen")
      .withArgs(4n);
    await time.increaseTo(now + 20);
    await expect(voting.connect(outsider).finalizeVoting(4n)).to.be.revertedWithCustomError(
      voting,
      "UnauthorizedRole"
    );
    await expect(voting.finalizeVoting(4n))
      .to.emit(voting, "VotingFinalized")
      .withArgs(4n, designId, 1n);
    expect(await voting.isVotingWinner(designId)).to.equal(true);
    await expect(voting.finalizeVoting(4n))
      .to.be.revertedWithCustomError(voting, "AlreadyFinalised")
      .withArgs(4n);
  });

  it("selects the lowest designId on a positive tie", async function () {
    const { fanA, fanB, voting, makeVotingEligible } = await loadFixture(
      deploySystemFixture
    );
    const low = await makeVotingEligible("ipfs://tie-low");
    const high = await makeVotingEligible("ipfs://tie-high");
    const now = await time.latest();
    await voting.openVoting(5n, [high.designId, low.designId], now + 2, now + 30);
    await time.increaseTo(now + 2);
    await voting.connect(fanA).vote(5n, high.designId);
    await voting.connect(fanB).vote(5n, low.designId);
    await time.increaseTo(now + 30);
    await voting.finalizeVoting(5n);
    expect((await voting.getRound(5n)).winnerDesignId).to.equal(low.designId);
  });

  it("finalizes a zero-vote round with winner 0 and no fake winner", async function () {
    const { voting, makeVotingEligible } = await loadFixture(deploySystemFixture);
    const { designId } = await makeVotingEligible("ipfs://zero-votes");
    const now = await time.latest();
    await voting.openVoting(6n, [designId], now + 2, now + 20);
    await time.increaseTo(now + 20);
    await expect(voting.finalizeVoting(6n))
      .to.emit(voting, "VotingFinalized")
      .withArgs(6n, 0n, 0n);
    expect((await voting.getRound(6n)).winnerDesignId).to.equal(0n);
    expect(await voting.isVotingWinner(0n)).to.equal(false);
    expect(await voting.isVotingWinner(designId)).to.equal(false);
  });

  it("keeps vote and voter accounting independent across rounds", async function () {
    const { fanA, fanB, voting, makeVotingEligible } = await loadFixture(
      deploySystemFixture
    );
    const { designId } = await makeVotingEligible("ipfs://independent-rounds");
    const now = await time.latest();
    await voting.openVoting(7n, [designId], now + 20, now + 40);
    await voting.openVoting(8n, [designId], now + 20, now + 40);
    await time.increaseTo(now + 20);
    await voting.connect(fanA).vote(7n, designId);
    await voting.connect(fanA).vote(8n, designId);
    await voting.connect(fanB).vote(8n, designId);
    expect(await voting.voteCount(7n, designId)).to.equal(1n);
    expect(await voting.voteCount(8n, designId)).to.equal(2n);
    expect(await voting.hasVoted(7n, fanB.address)).to.equal(false);
  });
});
