const deployment = require("../../deployments/localhost.json");
const { ethers } = require("hardhat");
const { hash } = require("./lib/system");

async function main() {
  const [, artist] = await ethers.getSigners();
  const registry = await ethers.getContractAt("AssetRegistry", deployment.contracts.assetRegistry, artist);
  const nextId = await registry.submitDesign.staticCall("mock://design-1", hash(ethers, "design-1"), hash(ethers, "ai-disclosure"), hash(ethers, "provenance"));
  await (await registry.submitDesign("mock://design-1", hash(ethers, "design-1"), hash(ethers, "ai-disclosure"), hash(ethers, "provenance"))).wait();
  console.log(`Seeded Design ${nextId}.`);
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
