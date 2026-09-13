const fs = require("node:fs/promises");
const path = require("node:path");

const hash = (ethers, label) => ethers.keccak256(ethers.toUtf8Bytes(label));

async function deploySystem(ethers) {
  const signers = await ethers.getSigners();
  const [admin, artist, verifier, publisher, gameDeveloper, fanA, fanB,
    buyerA, buyerB, buyerC, publisherTreasury, marketplaceTreasury] = signers;

  const payment = await (await ethers.getContractFactory("MockVND")).deploy();
  const assetRegistry = await (await ethers.getContractFactory("AssetRegistry")).deploy();
  const voting = await (await ethers.getContractFactory("CommunityVoting")).deploy(await assetRegistry.getAddress());
  await (await assetRegistry.setCommunityVoting(await voting.getAddress())).wait();
  const compatibility = await (await ethers.getContractFactory("CompatibilityRegistry")).deploy(await assetRegistry.getAddress());
  const entitlement = await (await ethers.getContractFactory("SkinEntitlement1155")).deploy(
    await assetRegistry.getAddress(), await compatibility.getAddress(),
  );
  const primary = await (await ethers.getContractFactory("PrimaryAuction")).deploy(
    await assetRegistry.getAddress(), await voting.getAddress(), await compatibility.getAddress(),
    await payment.getAddress(), await entitlement.getAddress(), publisherTreasury.address,
    marketplaceTreasury.address,
  );
  const secondary = await (await ethers.getContractFactory("SecondaryMarketplace")).deploy(
    await assetRegistry.getAddress(), await payment.getAddress(), await entitlement.getAddress(),
    publisherTreasury.address, marketplaceTreasury.address,
  );

  await Promise.all([payment.waitForDeployment(), assetRegistry.waitForDeployment(), voting.waitForDeployment(),
    compatibility.waitForDeployment(), entitlement.waitForDeployment(), primary.waitForDeployment(), secondary.waitForDeployment()]);

  const grants = [
    assetRegistry.grantRole(await assetRegistry.ARTIST_ROLE(), artist.address),
    assetRegistry.grantRole(await assetRegistry.VERIFIER_ROLE(), verifier.address),
    assetRegistry.grantRole(await assetRegistry.PUBLISHER_ROLE(), publisher.address),
    compatibility.grantRole(await compatibility.PUBLISHER_ROLE(), publisher.address),
    compatibility.grantRole(await compatibility.GAME_DEVELOPER_ROLE(), gameDeveloper.address),
    primary.grantRole(await primary.PUBLISHER_ROLE(), publisher.address),
    voting.grantRole(await voting.FAN_ROLE(), fanA.address),
    voting.grantRole(await voting.FAN_ROLE(), fanB.address),
  ];
  for (const tx of grants) await (await tx).wait();
  await (await entitlement.grantRole(await entitlement.MINTER_ROLE(), await primary.getAddress())).wait();
  await (await entitlement.setMarketplaceAuthorization(await secondary.getAddress(), true)).wait();

  return {
    actors: { admin, artist, verifier, publisher, gameDeveloper, fanA, fanB,
      buyerA, buyerB, buyerC, publisherTreasury, marketplaceTreasury },
    contracts: { payment, assetRegistry, voting, compatibility, entitlement, primary, secondary },
  };
}

async function writeDeployment(contracts, chainId) {
  const addresses = { chainId: Number(chainId), generatedAt: new Date().toISOString(), contracts: {} };
  for (const [name, contract] of Object.entries(contracts)) addresses.contracts[name] = await contract.getAddress();
  const target = path.join(process.cwd(), "deployments", "localhost.json");
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.writeFile(target, `${JSON.stringify(addresses, null, 2)}\n`);
  return addresses;
}

module.exports = { deploySystem, hash, writeDeployment };
