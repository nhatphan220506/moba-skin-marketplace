const fs = require("node:fs/promises");
const path = require("node:path");
const { network } = require("hardhat");

async function main() {
  await network.provider.send("hardhat_reset");
  const data = path.join(process.cwd(), "data");
  for (const name of ["account-links", "activations", "creators", "designs", "files", "production-records", "verification-reports"]) {
    await fs.copyFile(path.join(data, "seeds", `${name}.json`), path.join(data, `${name}.json`));
  }
  console.log("Local chain and Kat data reset to deterministic state.");
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
