const deployment = require("../../deployments/sepolia.json");
const hre = require("hardhat");

async function main() {
  const network = await hre.ethers.provider.getNetwork();
  if (Number(network.chainId) !== 11155111) throw new Error("MockVND seeding is restricted to Sepolia.");
  const buyers = ["SEPOLIA_BUYER_A_ADDRESS", "SEPOLIA_BUYER_B_ADDRESS", "SEPOLIA_BUYER_C_ADDRESS"].map((name) => ({ name, address: process.env[name] }));
  if (buyers.some((buyer) => !buyer.address)) throw new Error("All three Sepolia buyer addresses are required.");
  const payment = await hre.ethers.getContractAt("MockVND", deployment.contracts.payment);
  const target = hre.ethers.parseEther(process.env.SEPOLIA_BUYER_MOCK_VND || "1000");
  for (const buyer of buyers) {
    const current = await payment.balanceOf(buyer.address);
    if (current >= target) { console.log(`${buyer.name} already has the target test balance.`); continue; }
    const receipt = await (await payment.mint(buyer.address, target - current)).wait(2);
    console.log(`Seeded ${buyer.name}: https://sepolia.etherscan.io/tx/${receipt.hash}`);
  }
}

main().catch((error) => { console.error(error.message); process.exitCode = 1; });
