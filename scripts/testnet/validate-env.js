require("dotenv/config");
const { isAddress } = require("ethers");

const required = ["SEPOLIA_DEPLOYER_PRIVATE_KEY"];
const missing = required.filter((name) => !process.env[name]);
if (missing.length) {
  console.error(`Missing required environment variables: ${missing.join(", ")}`);
  process.exit(1);
}

if (!/^0x[0-9a-fA-F]{64}$/.test(process.env.SEPOLIA_DEPLOYER_PRIVATE_KEY)) {
  console.error("SEPOLIA_DEPLOYER_PRIVATE_KEY must be a 0x-prefixed 32-byte test-wallet key.");
  process.exit(1);
}

for (const [name, value] of Object.entries(process.env)) {
  if (name.startsWith("SEPOLIA_") && name.endsWith("_ADDRESS") && value && !isAddress(value)) {
    console.error(`${name} is not a valid Ethereum address.`);
    process.exit(1);
  }
}

console.log("Sepolia configuration is structurally valid. No secret values were printed.");
