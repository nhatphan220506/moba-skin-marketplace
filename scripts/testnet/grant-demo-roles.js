const deployment = require("../../deployments/sepolia.json");
const hre = require("hardhat");

async function grantIfMissing(contract, role, account, label) {
  if (await contract.hasRole(role, account)) {
    console.log(`${label} already granted.`);
    return;
  }
  const receipt = await (await contract.grantRole(role, account)).wait(2);
  console.log(`${label}: https://sepolia.etherscan.io/tx/${receipt.hash}`);
}

async function main() {
  const network = await hre.ethers.provider.getNetwork();
  if (Number(network.chainId) !== 11155111) throw new Error("Demo roles are restricted to Sepolia.");
  const account = process.env.SEPOLIA_DEMO_WALLET_ADDRESS;
  if (!hre.ethers.isAddress(account)) throw new Error("SEPOLIA_DEMO_WALLET_ADDRESS is required.");
  const registry = await hre.ethers.getContractAt("AssetRegistry", deployment.contracts.assetRegistry);
  const compatibility = await hre.ethers.getContractAt("CompatibilityRegistry", deployment.contracts.compatibility);
  const voting = await hre.ethers.getContractAt("CommunityVoting", deployment.contracts.voting);
  const primary = await hre.ethers.getContractAt("PrimaryAuction", deployment.contracts.primary);
  const payment = await hre.ethers.getContractAt("MockVND", deployment.contracts.payment);
  await grantIfMissing(registry, await registry.ARTIST_ROLE(), account, "Artist role");
  await grantIfMissing(registry, await registry.VERIFIER_ROLE(), account, "Verifier role");
  await grantIfMissing(registry, await registry.PUBLISHER_ROLE(), account, "Publisher registry role");
  await grantIfMissing(compatibility, await compatibility.PUBLISHER_ROLE(), account, "Publisher production role");
  await grantIfMissing(compatibility, await compatibility.GAME_DEVELOPER_ROLE(), account, "Game developer role");
  await grantIfMissing(primary, await primary.PUBLISHER_ROLE(), account, "Publisher auction role");
  await grantIfMissing(voting, await voting.FAN_ROLE(), account, "Fan role");
  const target = hre.ethers.parseEther(process.env.SEPOLIA_DEMO_MOCK_VND || "1000");
  const current = await payment.balanceOf(account);
  if (current < target) {
    const receipt = await (await payment.mint(account, target - current)).wait(2);
    console.log(`Seeded demo wallet MockVND: https://sepolia.etherscan.io/tx/${receipt.hash}`);
  }
}

main().catch((error) => { console.error(error.message); process.exitCode = 1; });
