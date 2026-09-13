const deployment = require("../../deployments/localhost.json");
const { ethers } = require("hardhat");

async function grant(contract, role, address) {
  if (!(await contract.hasRole(role, address))) await (await contract.grantRole(role, address)).wait();
}
async function main() {
  const [admin, artist, verifier, publisher, gameDeveloper, fanA, fanB] = await ethers.getSigners();
  const c = deployment.contracts;
  const asset = await ethers.getContractAt("AssetRegistry", c.assetRegistry, admin);
  const voting = await ethers.getContractAt("CommunityVoting", c.voting, admin);
  const compatibility = await ethers.getContractAt("CompatibilityRegistry", c.compatibility, admin);
  const primary = await ethers.getContractAt("PrimaryAuction", c.primary, admin);
  await grant(asset, await asset.ARTIST_ROLE(), artist.address);
  await grant(asset, await asset.VERIFIER_ROLE(), verifier.address);
  await grant(asset, await asset.PUBLISHER_ROLE(), publisher.address);
  await grant(voting, await voting.FAN_ROLE(), fanA.address); await grant(voting, await voting.FAN_ROLE(), fanB.address);
  await grant(compatibility, await compatibility.PUBLISHER_ROLE(), publisher.address);
  await grant(compatibility, await compatibility.GAME_DEVELOPER_ROLE(), gameDeveloper.address);
  await grant(primary, await primary.PUBLISHER_ROLE(), publisher.address);
  console.log("Demo roles assigned idempotently.");
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
