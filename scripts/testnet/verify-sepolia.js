const deployment = require("../../deployments/sepolia.json");
const hre = require("hardhat");

async function main() {
  if (!process.env.ETHERSCAN_API_KEY) throw new Error("ETHERSCAN_API_KEY is required for source verification.");
  for (const [name, address] of Object.entries(deployment.contracts)) {
    try {
      await hre.run("verify:verify", { address, constructorArguments: deployment.constructorArguments[name] || [] });
      console.log(`Verified ${name}: https://sepolia.etherscan.io/address/${address}#code`);
    } catch (error) {
      if (/already verified/i.test(error.message)) console.log(`${name} is already verified.`);
      else throw error;
    }
  }
}

main().catch((error) => { console.error(error.message); process.exitCode = 1; });
