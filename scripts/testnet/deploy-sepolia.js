const fs = require("node:fs/promises");
const path = require("node:path");
const hre = require("hardhat");

async function deployed(factoryName, args = []) {
  const contract = await (await hre.ethers.getContractFactory(factoryName)).deploy(...args);
  await contract.waitForDeployment();
  const receipt = await contract.deploymentTransaction().wait(Number(process.env.SEPOLIA_CONFIRMATIONS || 2));
  return { contract, address: await contract.getAddress(), receipt, args };
}

async function confirmed(label, promise, transactions) {
  const receipt = await (await promise).wait(Number(process.env.SEPOLIA_CONFIRMATIONS || 2));
  transactions.push({ label, hash: receipt.hash, blockNumber: receipt.blockNumber });
}

async function main() {
  const network = await hre.ethers.provider.getNetwork();
  if (Number(network.chainId) !== 11155111) throw new Error(`Refusing to deploy on chain ${network.chainId}; expected Sepolia (11155111).`);
  const [deployer] = await hre.ethers.getSigners();
  if (!deployer) throw new Error("Missing SEPOLIA_DEPLOYER_PRIVATE_KEY.");
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  if (balance === 0n) throw new Error("The dedicated deployer wallet has no Sepolia ETH.");
  const target = path.join(process.cwd(), "deployments", "sepolia.json");
  try {
    const existing = JSON.parse(await fs.readFile(target, "utf8"));
    if (existing.deployed !== false && process.env.ALLOW_SEPOLIA_REDEPLOY !== "true") throw new Error("deployments/sepolia.json already contains a deployment. Set ALLOW_SEPOLIA_REDEPLOY=true only for an intentional replacement.");
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }

  const actor = (name) => process.env[name] || deployer.address;
  const actors = {
    admin: deployer.address,
    artist: actor("SEPOLIA_ARTIST_ADDRESS"),
    verifier: actor("SEPOLIA_VERIFIER_ADDRESS"),
    publisher: actor("SEPOLIA_PUBLISHER_ADDRESS"),
    gameDeveloper: actor("SEPOLIA_GAME_DEVELOPER_ADDRESS"),
    fan: actor("SEPOLIA_FAN_ADDRESS"),
    fanB: actor("SEPOLIA_FAN_B_ADDRESS"),
    buyerA: actor("SEPOLIA_BUYER_A_ADDRESS"),
    buyerB: actor("SEPOLIA_BUYER_B_ADDRESS"),
    buyerC: actor("SEPOLIA_BUYER_C_ADDRESS"),
    publisherTreasury: actor("SEPOLIA_PUBLISHER_TREASURY_ADDRESS"),
    marketplaceTreasury: actor("SEPOLIA_MARKETPLACE_TREASURY_ADDRESS"),
  };
  const transactions = [];

  const payment = await deployed("MockVND");
  const assetRegistry = await deployed("AssetRegistry");
  const voting = await deployed("CommunityVoting", [assetRegistry.address]);
  await confirmed("AssetRegistry.setCommunityVoting", assetRegistry.contract.setCommunityVoting(voting.address), transactions);
  const compatibility = await deployed("CompatibilityRegistry", [assetRegistry.address]);
  const entitlement = await deployed("SkinEntitlement1155", [assetRegistry.address, compatibility.address]);
  const primary = await deployed("PrimaryAuction", [assetRegistry.address, voting.address, compatibility.address, payment.address, entitlement.address, actors.publisherTreasury, actors.marketplaceTreasury]);
  const secondary = await deployed("SecondaryMarketplace", [assetRegistry.address, payment.address, entitlement.address, actors.publisherTreasury, actors.marketplaceTreasury]);
  const items = { payment, assetRegistry, voting, compatibility, entitlement, primary, secondary };
  for (const [name, item] of Object.entries(items)) transactions.unshift({ label: `deploy:${name}`, hash: item.receipt.hash, blockNumber: item.receipt.blockNumber });

  await confirmed("AssetRegistry.ARTIST_ROLE", assetRegistry.contract.grantRole(await assetRegistry.contract.ARTIST_ROLE(), actors.artist), transactions);
  await confirmed("AssetRegistry.VERIFIER_ROLE", assetRegistry.contract.grantRole(await assetRegistry.contract.VERIFIER_ROLE(), actors.verifier), transactions);
  await confirmed("AssetRegistry.PUBLISHER_ROLE", assetRegistry.contract.grantRole(await assetRegistry.contract.PUBLISHER_ROLE(), actors.publisher), transactions);
  await confirmed("CompatibilityRegistry.PUBLISHER_ROLE", compatibility.contract.grantRole(await compatibility.contract.PUBLISHER_ROLE(), actors.publisher), transactions);
  await confirmed("CompatibilityRegistry.GAME_DEVELOPER_ROLE", compatibility.contract.grantRole(await compatibility.contract.GAME_DEVELOPER_ROLE(), actors.gameDeveloper), transactions);
  await confirmed("PrimaryAuction.PUBLISHER_ROLE", primary.contract.grantRole(await primary.contract.PUBLISHER_ROLE(), actors.publisher), transactions);
  await confirmed("CommunityVoting.FAN_ROLE", voting.contract.grantRole(await voting.contract.FAN_ROLE(), actors.fan), transactions);
  if (actors.fanB.toLowerCase() !== actors.fan.toLowerCase()) await confirmed("CommunityVoting.FAN_ROLE:B", voting.contract.grantRole(await voting.contract.FAN_ROLE(), actors.fanB), transactions);
  await confirmed("SkinEntitlement1155.MINTER_ROLE", entitlement.contract.grantRole(await entitlement.contract.MINTER_ROLE(), primary.address), transactions);
  await confirmed("SkinEntitlement1155.marketplace", entitlement.contract.setMarketplaceAuthorization(secondary.address, true), transactions);

  const contracts = Object.fromEntries(Object.entries(items).map(([name, item]) => [name, item.address]));
  const constructorArguments = Object.fromEntries(Object.entries(items).map(([name, item]) => [name, item.args]));
  const deployment = { chainId: 11155111, network: "sepolia", deployed: true, generatedAt: new Date().toISOString(), deploymentBlock: Math.min(...transactions.map((tx) => tx.blockNumber)), deployer: deployer.address, actors, contracts, constructorArguments, transactions };
  const temporary = `${target}.${process.pid}.tmp`;
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.writeFile(temporary, `${JSON.stringify(deployment, null, 2)}\n`);
  await fs.rename(temporary, target);
  console.log(`Sepolia deployment complete. Public evidence saved to ${target}`);
  console.table(Object.entries(contracts).map(([contract, address]) => ({ contract, address, explorer: `https://sepolia.etherscan.io/address/${address}` })));
}

main().catch((error) => { console.error(error.message); process.exitCode = 1; });
