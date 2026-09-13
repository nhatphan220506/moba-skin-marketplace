const deployment = require("../../deployments/localhost.json");
const { ethers } = require("hardhat");

async function main() {
  const signers = await ethers.getSigners();
  const payment = await ethers.getContractAt("MockVND", deployment.contracts.payment, signers[0]);
  for (const buyer of signers.slice(7, 10)) {
    const balance = await payment.balanceOf(buyer.address);
    if (balance < 1000n) await (await payment.mint(buyer.address, 1000n - balance)).wait();
  }
  console.log("Buyer A, Buyer B, and Buyer C each have at least 1000 MockVND.");
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
