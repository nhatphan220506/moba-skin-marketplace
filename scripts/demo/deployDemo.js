const { ethers } = require("hardhat");
const { deploySystem, writeDeployment } = require("./lib/system");

async function main() {
  const { contracts } = await deploySystem(ethers);
  const network = await ethers.provider.getNetwork();
  console.log(JSON.stringify(await writeDeployment(contracts, network.chainId), null, 2));
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
