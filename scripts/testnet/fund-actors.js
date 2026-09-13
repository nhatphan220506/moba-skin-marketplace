const hre = require("hardhat");

async function main() {
  const network = await hre.ethers.provider.getNetwork();
  if (Number(network.chainId) !== 11155111) throw new Error("Actor funding is restricted to Sepolia.");
  const [deployer] = await hre.ethers.getSigners();
  const amount = hre.ethers.parseEther(process.env.SEPOLIA_ACTOR_ETH || "0.01");
  const names = ["SEPOLIA_ARTIST_ADDRESS", "SEPOLIA_VERIFIER_ADDRESS", "SEPOLIA_PUBLISHER_ADDRESS", "SEPOLIA_GAME_DEVELOPER_ADDRESS", "SEPOLIA_FAN_ADDRESS", "SEPOLIA_FAN_B_ADDRESS", "SEPOLIA_BUYER_A_ADDRESS", "SEPOLIA_BUYER_B_ADDRESS", "SEPOLIA_BUYER_C_ADDRESS"];
  const recipients = [...new Set(names.map((name) => process.env[name]).filter((address) => address && address.toLowerCase() !== deployer.address.toLowerCase()))];
  if (!recipients.length) throw new Error("No distinct Sepolia actor addresses are configured.");
  for (const recipient of recipients) {
    const existing = await hre.ethers.provider.getBalance(recipient);
    if (existing >= amount) { console.log(`${recipient} already has sufficient test ETH.`); continue; }
    const receipt = await (await deployer.sendTransaction({ to: recipient, value: amount - existing })).wait(2);
    console.log(`Funded ${recipient}: https://sepolia.etherscan.io/tx/${receipt.hash}`);
  }
}

main().catch((error) => { console.error(error.message); process.exitCode = 1; });
