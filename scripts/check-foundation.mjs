import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const requiredFiles = [
  "README.md",
  ".env.example",
  "config/demo.ts",
  "config/roles.ts",
  "types/design.ts",
  "types/auction.ts",
  "types/verification.ts",
  "types/activation.ts",
  "types/evidence.ts",
  "docs/interfaces.md",
  "docs/masterplan/Masterplan_Final.docx",
  "docs/handover/01_Nhat_Technical_Lead_50pct_Handover.docx",
  "docs/handover/02_Kat_Offchain_Backend_25pct_Handover.docx",
  "docs/handover/03_Van_Testing_Evidence_25pct_Handover.docx",
  "contracts/AssetRegistry.sol",
  "contracts/CommunityVoting.sol",
  "contracts/CompatibilityRegistry.sol",
  "contracts/MockVND.sol",
  "contracts/SkinEntitlement1155.sol",
  "contracts/PrimaryAuction.sol",
  "contracts/SecondaryMarketplace.sol",
];

const missing = requiredFiles.filter((file) => !existsSync(resolve(root, file)));
if (missing.length > 0) {
  console.error("M0 missing required files:");
  missing.forEach((file) => console.error(`- ${file}`));
  process.exit(1);
}

const demo = readFileSync(resolve(root, "config/demo.ts"), "utf8");
const requiredBps = ["artist: 8_000", "publisher: 1_000", "marketplace: 1_000", "seller: 9_000", "artist: 500", "publisher: 300", "marketplace: 200"];
const missingBps = requiredBps.filter((value) => !demo.includes(value));
if (missingBps.length > 0) {
  console.error(`M0 demo split is incomplete: ${missingBps.join(", ")}`);
  process.exit(1);
}

const interfaces = readFileSync(resolve(root, "docs/interfaces.md"), "utf8");
const contracts = [
  "AssetRegistry",
  "CommunityVoting",
  "CompatibilityRegistry",
  "MockVND",
  "SkinEntitlement1155",
  "PrimaryAuction",
  "SecondaryMarketplace",
];
const undocumented = contracts.filter((name) => !interfaces.includes(name));
if (undocumented.length > 0) {
  console.error(`M0 contract interface documentation missing: ${undocumented.join(", ")}`);
  process.exit(1);
}

const forbiddenEnv = /(?:PRIVATE_KEY|MNEMONIC|SECRET)[ \t]*=[ \t]*[^\s#]+/;
const envExample = readFileSync(resolve(root, ".env.example"), "utf8");
if (forbiddenEnv.test(envExample)) {
  console.error(".env.example appears to contain a secret value.");
  process.exit(1);
}

console.log(`M0 foundation check passed: ${requiredFiles.length} required files present.`);
console.log("Shared contracts, handover documents and scope baseline are present.");
