// @ts-nocheck
const { ethers } = require("hardhat");
const { parseReceipt } = require("../../lib/evidence/parseReceipt");

async function main() {
  const [admin, recipient] = await ethers.getSigners();
  const payment = await (await ethers.getContractFactory("MockVND")).deploy();
  await payment.waitForDeployment();
  const receipt = await (await payment.mint(recipient.address, 25n)).wait();
  const rows = parseReceipt(receipt, [{ name: "MockVND", address: await payment.getAddress(), abi: payment.interface.fragments }],
    Number((await ethers.provider.getBlock(receipt.blockNumber)).timestamp));
  if (!rows.some((row) => row.eventName === "Transfer" && row.transactionHash === receipt.hash)) throw new Error("confirmed receipt was not decoded");
  const ignored = parseReceipt(receipt, [{ name: "Unknown", address: admin.address, abi: [] }]);
  if (ignored.length !== 0) throw new Error("unsupported event was not ignored safely");
  console.log(`PASS evidence parser: ${rows.length} supported row(s), unknown events ignored`);
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
