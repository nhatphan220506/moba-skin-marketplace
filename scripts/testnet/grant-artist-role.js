const deployment = require("../../deployments/sepolia.json");
const hre = require("hardhat");

async function main() {
  const network = await hre.ethers.provider.getNetwork();
  if (Number(network.chainId) !== 11155111) {
    throw new Error("Artist role grants are restricted to Sepolia.");
  }

  const account = process.env.SEPOLIA_ARTIST_WALLET_ADDRESS;
  if (!hre.ethers.isAddress(account)) {
    throw new Error("SEPOLIA_ARTIST_WALLET_ADDRESS is required.");
  }

  const registry = await hre.ethers.getContractAt(
    "AssetRegistry",
    deployment.contracts.assetRegistry,
  );
  const artistRole = await registry.ARTIST_ROLE();

  if (await registry.hasRole(artistRole, account)) {
    console.log(`Artist role already granted to ${account}.`);
    return;
  }

  const transaction = await registry.grantRole(artistRole, account);
  const receipt = await transaction.wait(2);
  console.log(`Artist role granted to ${account}.`);
  console.log(`Transaction: https://sepolia.etherscan.io/tx/${receipt.hash}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
