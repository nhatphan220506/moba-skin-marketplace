const deployment = require("../../deployments/sepolia.json");
const hre = require("hardhat");

async function main() {
  const network = await hre.ethers.provider.getNetwork();
  if (Number(network.chainId) !== 11155111) throw new Error("Smoke test must run on Sepolia.");
  const checks = [];
  for (const [name, address] of Object.entries(deployment.contracts)) {
    const code = await hre.ethers.provider.getCode(address);
    checks.push({ name, address, bytecode: code !== "0x" ? "PASS" : "MISSING" });
  }
  const registry = await hre.ethers.getContractAt("AssetRegistry", deployment.contracts.assetRegistry);
  const linkEvents = await registry.queryFilter(registry.filters.CommunityVotingUpdated(), deployment.deploymentBlock);
  const linkedVoting = linkEvents.at(-1)?.args?.newVoting;
  checks.push({ name: "AssetRegistry→Voting", address: linkedVoting || "missing", bytecode: linkedVoting?.toLowerCase() === deployment.contracts.voting.toLowerCase() ? "PASS" : "MISMATCH" });
  console.table(checks);
  if (checks.some((check) => check.bytecode !== "PASS")) throw new Error("Sepolia smoke test failed.");
}

main().catch((error) => { console.error(error.message); process.exitCode = 1; });
