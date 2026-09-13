const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

const hash = (label) => ethers.keccak256(ethers.toUtf8Bytes(label));

async function deploySystemFixture() {
  const [
    admin,
    artist,
    verifier,
    publisher,
    gameDeveloper,
    fanA,
    fanB,
    fanC,
    buyerA,
    buyerB,
    buyerC,
    publisherTreasury,
    marketplaceTreasury,
    outsider,
    minter,
  ] = await ethers.getSigners();

  const MockVND = await ethers.getContractFactory("MockVND");
  const payment = await MockVND.deploy();

  const AssetRegistry = await ethers.getContractFactory("AssetRegistry");
  const assetRegistry = await AssetRegistry.deploy();

  const CommunityVoting = await ethers.getContractFactory("CommunityVoting");
  const voting = await CommunityVoting.deploy(await assetRegistry.getAddress());
  await assetRegistry.setCommunityVoting(await voting.getAddress());

  const CompatibilityRegistry = await ethers.getContractFactory("CompatibilityRegistry");
  const compatibility = await CompatibilityRegistry.deploy(
    await assetRegistry.getAddress()
  );

  const SkinEntitlement1155 = await ethers.getContractFactory(
    "SkinEntitlement1155"
  );
  const entitlement = await SkinEntitlement1155.deploy(
    await assetRegistry.getAddress(),
    await compatibility.getAddress()
  );

  const PrimaryAuction = await ethers.getContractFactory("PrimaryAuction");
  const primary = await PrimaryAuction.deploy(
    await assetRegistry.getAddress(),
    await voting.getAddress(),
    await compatibility.getAddress(),
    await payment.getAddress(),
    await entitlement.getAddress(),
    publisherTreasury.address,
    marketplaceTreasury.address
  );

  const SecondaryMarketplace = await ethers.getContractFactory(
    "SecondaryMarketplace"
  );
  const secondary = await SecondaryMarketplace.deploy(
    await assetRegistry.getAddress(),
    await payment.getAddress(),
    await entitlement.getAddress(),
    publisherTreasury.address,
    marketplaceTreasury.address
  );

  await assetRegistry.grantRole(await assetRegistry.ARTIST_ROLE(), artist.address);
  await assetRegistry.grantRole(
    await assetRegistry.VERIFIER_ROLE(),
    verifier.address
  );
  await assetRegistry.grantRole(
    await assetRegistry.PUBLISHER_ROLE(),
    publisher.address
  );

  const fanRole = await voting.FAN_ROLE();
  for (const fan of [fanA, fanB, fanC]) {
    await voting.grantRole(fanRole, fan.address);
  }

  await compatibility.grantRole(
    await compatibility.PUBLISHER_ROLE(),
    publisher.address
  );
  await compatibility.grantRole(
    await compatibility.GAME_DEVELOPER_ROLE(),
    gameDeveloper.address
  );

  await primary.grantRole(await primary.PUBLISHER_ROLE(), publisher.address);
  await entitlement.grantRole(
    await entitlement.MINTER_ROLE(),
    await primary.getAddress()
  );
  await entitlement.grantRole(await entitlement.MINTER_ROLE(), minter.address);
  await entitlement.setMarketplaceAuthorization(
    await secondary.getAddress(),
    true
  );

  for (const buyer of [buyerA, buyerB, buyerC]) {
    await payment.mint(buyer.address, 10_000n);
    await payment.connect(buyer).approve(await primary.getAddress(), 10_000n);
    await payment.connect(buyer).approve(await secondary.getAddress(), 10_000n);
  }

  async function submitDesign(metadataURI = "ipfs://design-1") {
    const artworkHash = hash(`${metadataURI}:artwork`);
    const aiDisclosureHash = hash(`${metadataURI}:ai`);
    const provenanceHash = hash(`${metadataURI}:provenance`);
    const designId = await assetRegistry
      .connect(artist)
      .submitDesign.staticCall(
        metadataURI,
        artworkHash,
        aiDisclosureHash,
        provenanceHash
      );
    await assetRegistry
      .connect(artist)
      .submitDesign(
        metadataURI,
        artworkHash,
        aiDisclosureHash,
        provenanceHash
      );
    return {
      designId,
      metadataURI,
      artworkHash,
      aiDisclosureHash,
      provenanceHash,
    };
  }

  async function makeVotingEligible(metadataURI) {
    const design = await submitDesign(metadataURI);
    await assetRegistry
      .connect(verifier)
      .verifyDesign(design.designId, hash(`${metadataURI}:verification`));
    await assetRegistry
      .connect(publisher)
      .approveConceptEligibility(
        design.designId,
        hash(`${metadataURI}:publisher-review`)
      );
    return design;
  }

  async function electWinner(designIds, roundId = 1n, voters = [fanA]) {
    const now = await time.latest();
    const startTime = now + 2;
    const endTime = now + 100;
    await voting.openVoting(roundId, designIds, startTime, endTime);
    await time.increaseTo(startTime);
    for (let index = 0; index < voters.length; index += 1) {
      await voting
        .connect(voters[index])
        .vote(roundId, designIds[index % designIds.length]);
    }
    await time.increaseTo(endTime);
    await voting.finalizeVoting(roundId);
    return { roundId, startTime, endTime };
  }

  async function recordAgreement(designId, options = {}) {
    const artistPrimaryShareBps = options.artistPrimaryShareBps ?? 8_000;
    const artistResaleRoyaltyBps = options.artistResaleRoyaltyBps ?? 500;
    await assetRegistry
      .connect(publisher)
      .recordAgreement(
        designId,
        hash(`agreement:${designId}`),
        artistPrimaryShareBps,
        artistResaleRoyaltyBps
      );
  }

  async function approveProduction(designId, maxSupply = 10n) {
    await compatibility
      .connect(publisher)
      .submitProduction(
        designId,
        hash(`production:${designId}`),
        hash(`compatibility:${designId}`),
        "1.0.0"
      );
    await compatibility
      .connect(gameDeveloper)
      .approveCompatibility(
        designId,
        hash(`game:${designId}`),
        maxSupply
      );
  }

  async function prepareMarketReady(options = {}) {
    const metadataURI = options.metadataURI ?? "ipfs://market-ready";
    const design = await makeVotingEligible(metadataURI);
    await electWinner(
      [design.designId],
      options.roundId ?? design.designId,
      options.voters ?? [fanA]
    );
    await recordAgreement(design.designId, options);
    await approveProduction(design.designId, options.maxSupply ?? 10n);
    return design;
  }

  async function createAuction(designId, options = {}) {
    const now = await time.latest();
    const startTime = options.startTime ?? now + 2;
    const endTime = options.endTime ?? now + 100;
    const reservePrice = options.reservePrice ?? 100n;
    const minimumIncrement = options.minimumIncrement ?? 10n;
    const auctionId = await primary
      .connect(publisher)
      .createAuction.staticCall(
        designId,
        reservePrice,
        minimumIncrement,
        startTime,
        endTime
      );
    await primary
      .connect(publisher)
      .createAuction(
        designId,
        reservePrice,
        minimumIncrement,
        startTime,
        endTime
      );
    return {
      auctionId,
      startTime,
      endTime,
      reservePrice,
      minimumIncrement,
    };
  }

  return {
    admin,
    artist,
    verifier,
    publisher,
    gameDeveloper,
    fanA,
    fanB,
    fanC,
    buyerA,
    buyerB,
    buyerC,
    publisherTreasury,
    marketplaceTreasury,
    outsider,
    minter,
    payment,
    assetRegistry,
    voting,
    compatibility,
    entitlement,
    primary,
    secondary,
    submitDesign,
    makeVotingEligible,
    electWinner,
    recordAgreement,
    approveProduction,
    prepareMarketReady,
    createAuction,
  };
}

module.exports = { deploySystemFixture, hash };
