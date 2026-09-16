const fs = require("node:fs/promises");
const path = require("node:path");
const hre = require("hardhat");
const deployment = require("../../deployments/sepolia.json");

const EXPLORER = "https://sepolia.etherscan.io";
const EVIDENCE_PATH = path.join(
  process.cwd(),
  "docs",
  "integration",
  "evidence",
  "sepolia-metamask-admin-grants.json",
);

async function main() {
  const network = await hre.ethers.provider.getNetwork();
  if (Number(network.chainId) !== 11155111) {
    throw new Error("Admin grants are restricted to Sepolia.");
  }

  const rawAccount = process.env.SEPOLIA_ADMIN_WALLET_ADDRESS;
  if (!hre.ethers.isAddress(rawAccount)) {
    throw new Error("SEPOLIA_ADMIN_WALLET_ADDRESS is required.");
  }

  const account = hre.ethers.getAddress(rawAccount);
  const [deployer] = await hre.ethers.getSigners();
  const contracts = {
    payment: await hre.ethers.getContractAt("MockVND", deployment.contracts.payment),
    assetRegistry: await hre.ethers.getContractAt("AssetRegistry", deployment.contracts.assetRegistry),
    voting: await hre.ethers.getContractAt("CommunityVoting", deployment.contracts.voting),
    compatibility: await hre.ethers.getContractAt("CompatibilityRegistry", deployment.contracts.compatibility),
    entitlement: await hre.ethers.getContractAt("SkinEntitlement1155", deployment.contracts.entitlement),
    primary: await hre.ethers.getContractAt("PrimaryAuction", deployment.contracts.primary),
  };
  const grants = [
    ["MockVND.DEFAULT_ADMIN_ROLE", contracts.payment, hre.ethers.ZeroHash],
    ["MockVND.MINTER_ROLE", contracts.payment, await contracts.payment.MINTER_ROLE()],
    ["AssetRegistry.DEFAULT_ADMIN_ROLE", contracts.assetRegistry, hre.ethers.ZeroHash],
    ["CommunityVoting.DEFAULT_ADMIN_ROLE", contracts.voting, hre.ethers.ZeroHash],
    ["CompatibilityRegistry.DEFAULT_ADMIN_ROLE", contracts.compatibility, hre.ethers.ZeroHash],
    ["SkinEntitlement1155.DEFAULT_ADMIN_ROLE", contracts.entitlement, hre.ethers.ZeroHash],
    ["SkinEntitlement1155.PAUSER_ROLE", contracts.entitlement, await contracts.entitlement.PAUSER_ROLE()],
    ["PrimaryAuction.DEFAULT_ADMIN_ROLE", contracts.primary, hre.ethers.ZeroHash],
  ];

  const proof = {
    generatedAt: new Date().toISOString(),
    network: { name: "sepolia", chainId: 11155111 },
    account,
    grantor: deployer.address,
    result: "PASS",
    roles: [],
  };

  for (const [label, contract, role] of grants) {
    const contractAddress = await contract.getAddress();
    let transaction = null;
    if (!(await contract.hasRole(role, account))) {
      transaction = await contract.connect(deployer).grantRole(role, account);
      const receipt = await transaction.wait(1);
      if (!receipt || receipt.status !== 1) throw new Error(`${label} grant failed.`);
    }
    const verified = await contract.hasRole(role, account);
    if (!verified) throw new Error(`${label} verification failed.`);
    const record = {
      label,
      contract: contractAddress,
      role,
      verified,
      transactionHash: transaction ? transaction.hash : null,
      etherscan: transaction ? `${EXPLORER}/tx/${transaction.hash}` : null,
    };
    proof.roles.push(record);
    console.log(`${label}: ${transaction ? record.etherscan : "already granted"}`);
  }

  await fs.mkdir(path.dirname(EVIDENCE_PATH), { recursive: true });
  await fs.writeFile(EVIDENCE_PATH, `${JSON.stringify(proof, null, 2)}\n`);
  console.log(`Verified ${proof.roles.length}/${proof.roles.length} admin capabilities for ${account}.`);
  console.log(`Evidence: ${EVIDENCE_PATH}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
