const fs = require("node:fs/promises");
const path = require("node:path");
const hre = require("hardhat");
const { config } = require("dotenv");

const ACTOR_ENV = path.join(process.cwd(), ".env.sepolia-actors.local");
const EVIDENCE_PATH = path.join(process.cwd(), "docs", "integration", "evidence", "sepolia-distinct-wallet-lifecycle.json");
const API = process.env.KAT_API_BASE_URL || "https://moba-forge-api.onrender.com";
const EXPLORER = "https://sepolia.etherscan.io";
const ROLE_NAMES = ["admin", "artist", "verifier", "publisher", "gameTeam", "fan"];

const hash = (label) => hre.ethers.keccak256(hre.ethers.toUtf8Bytes(`moba-forge:${label}:${Date.now()}`));
const sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

async function loadOrCreateActors() {
  try {
    await fs.access(ACTOR_ENV);
  } catch {
    const generated = Object.fromEntries(ROLE_NAMES.map((name) => [name, hre.ethers.Wallet.createRandom()]));
    const keyName = (name) => `SEPOLIA_${name.replace(/([A-Z])/g, "_$1").toUpperCase()}`;
    const lines = ["# Dedicated Sepolia-only wallets. Never commit or reuse on mainnet."];
    for (const [name, wallet] of Object.entries(generated)) {
      lines.push(`${keyName(name)}_ADDRESS=${wallet.address}`);
      lines.push(`${keyName(name)}_PRIVATE_KEY=${wallet.privateKey}`);
    }
    await fs.writeFile(ACTOR_ENV, `${lines.join("\n")}\n`, { mode: 0o600 });
  }
  config({ path: ACTOR_ENV, override: true, quiet: true });
  const keyName = (name) => `SEPOLIA_${name.replace(/([A-Z])/g, "_$1").toUpperCase()}`;
  return Object.fromEntries(ROLE_NAMES.map((name) => {
    const key = process.env[`${keyName(name)}_PRIVATE_KEY`];
    if (!/^0x[0-9a-f]{64}$/i.test(key || "")) throw new Error(`Missing private key for ${name}`);
    return [name, new hre.ethers.Wallet(key, hre.ethers.provider)];
  }));
}

async function waitForTimestamp(target) {
  while (true) {
    const block = await hre.ethers.provider.getBlock("latest");
    if (Number(block.timestamp) >= target) return;
    await sleep(8_000);
  }
}

async function main() {
  const network = await hre.ethers.provider.getNetwork();
  if (Number(network.chainId) !== 11155111) throw new Error("This runner is restricted to Sepolia.");
  const deployment = require("../../deployments/sepolia.json");
  const [deployer] = await hre.ethers.getSigners();
  const actors = await loadOrCreateActors();
  const contracts = {
    payment: await hre.ethers.getContractAt("MockVND", deployment.contracts.payment),
    assetRegistry: await hre.ethers.getContractAt("AssetRegistry", deployment.contracts.assetRegistry),
    voting: await hre.ethers.getContractAt("CommunityVoting", deployment.contracts.voting),
    compatibility: await hre.ethers.getContractAt("CompatibilityRegistry", deployment.contracts.compatibility),
    entitlement: await hre.ethers.getContractAt("SkinEntitlement1155", deployment.contracts.entitlement),
    primary: await hre.ethers.getContractAt("PrimaryAuction", deployment.contracts.primary),
  };
  const proof = {
    generatedAt: new Date().toISOString(),
    network: { name: "sepolia", chainId: 11155111 },
    backend: API,
    deployer: deployer.address,
    actors: Object.fromEntries(Object.entries(actors).map(([name, wallet]) => [name, wallet.address])),
    transactions: [],
  };

  async function confirmed(label, promise, confirmations = 1) {
    const transaction = await promise;
    const receipt = await transaction.wait(confirmations);
    if (!receipt || receipt.status !== 1) throw new Error(`${label} failed`);
    proof.transactions.push({ label, hash: receipt.hash, blockNumber: receipt.blockNumber, etherscan: `${EXPLORER}/tx/${receipt.hash}` });
    console.log(`${label}: ${EXPLORER}/tx/${receipt.hash}`);
    return receipt;
  }

  const fundingTargets = { admin: "0.002", publisher: "0.0015", artist: "0.001", verifier: "0.001", gameTeam: "0.001", fan: "0.0015" };
  for (const [name, amountText] of Object.entries(fundingTargets)) {
    const wallet = actors[name];
    const target = hre.ethers.parseEther(amountText);
    const balance = await hre.ethers.provider.getBalance(wallet.address);
    if (balance < target) await confirmed(`fund:${name}`, deployer.sendTransaction({ to: wallet.address, value: target - balance }));
  }

  async function grant(contract, role, account, label) {
    if (!(await contract.hasRole(role, account))) await confirmed(`grant:${label}`, contract.connect(deployer).grantRole(role, account));
  }
  const zeroRole = hre.ethers.ZeroHash;
  await grant(contracts.payment, zeroRole, actors.admin.address, "MockVND.DEFAULT_ADMIN_ROLE");
  await grant(contracts.payment, await contracts.payment.MINTER_ROLE(), actors.admin.address, "MockVND.MINTER_ROLE");
  await grant(contracts.assetRegistry, zeroRole, actors.admin.address, "AssetRegistry.DEFAULT_ADMIN_ROLE");
  await grant(contracts.voting, zeroRole, actors.admin.address, "CommunityVoting.DEFAULT_ADMIN_ROLE");
  await grant(contracts.compatibility, zeroRole, actors.admin.address, "CompatibilityRegistry.DEFAULT_ADMIN_ROLE");
  await grant(contracts.entitlement, zeroRole, actors.admin.address, "SkinEntitlement1155.DEFAULT_ADMIN_ROLE");
  await grant(contracts.entitlement, await contracts.entitlement.PAUSER_ROLE(), actors.admin.address, "SkinEntitlement1155.PAUSER_ROLE");
  await grant(contracts.primary, zeroRole, actors.admin.address, "PrimaryAuction.DEFAULT_ADMIN_ROLE");
  await grant(contracts.assetRegistry, await contracts.assetRegistry.ARTIST_ROLE(), actors.artist.address, "AssetRegistry.ARTIST_ROLE");
  await grant(contracts.assetRegistry, await contracts.assetRegistry.VERIFIER_ROLE(), actors.verifier.address, "AssetRegistry.VERIFIER_ROLE");
  await grant(contracts.assetRegistry, await contracts.assetRegistry.PUBLISHER_ROLE(), actors.publisher.address, "AssetRegistry.PUBLISHER_ROLE");
  await grant(contracts.compatibility, await contracts.compatibility.PUBLISHER_ROLE(), actors.publisher.address, "CompatibilityRegistry.PUBLISHER_ROLE");
  await grant(contracts.primary, await contracts.primary.PUBLISHER_ROLE(), actors.publisher.address, "PrimaryAuction.PUBLISHER_ROLE");
  await grant(contracts.compatibility, await contracts.compatibility.GAME_DEVELOPER_ROLE(), actors.gameTeam.address, "CompatibilityRegistry.GAME_DEVELOPER_ROLE");
  await grant(contracts.voting, await contracts.voting.FAN_ROLE(), actors.fan.address, "CommunityVoting.FAN_ROLE");

  async function session(wallet) {
    const challengeResponse = await fetch(`${API}/api/auth/challenge?address=${wallet.address}`);
    const challenge = await challengeResponse.json();
    if (!challengeResponse.ok) throw new Error(`challenge: ${challenge.message || challengeResponse.status}`);
    const signature = await wallet.signMessage(challenge.message);
    const response = await fetch(`${API}/api/auth/session`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ address: wallet.address, nonce: challenge.nonce, signature }),
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(`session: ${payload.message || response.status}`);
    return payload.token;
  }

  const artistToken = await session(actors.artist);
  const form = new FormData();
  form.set("category", "concept-art");
  form.set("designId", String(Date.now()));
  const pngSentinel = Buffer.from("89504e470d0a1a0a0000000d49484452", "hex");
  form.set("file", new Blob([pngSentinel], { type: "image/png" }), "sepolia-lifecycle-proof.png");
  const uploadResponse = await fetch(`${API}/api/files/upload`, { method: "POST", headers: { authorization: `Bearer ${artistToken}` }, body: form });
  const uploaded = await uploadResponse.json();
  if (!uploadResponse.ok) throw new Error(`upload: ${uploaded.message || uploadResponse.status}`);
  proof.storage = { provider: "supabase-private", fileId: uploaded.fileId, storageURI: uploaded.storageURI, sha256: uploaded.sha256 };

  const artworkHash = uploaded.sha256.startsWith("0x") ? uploaded.sha256 : `0x${uploaded.sha256}`;
  const submitted = await confirmed("lifecycle:submitDesign", contracts.assetRegistry.connect(actors.artist).submitDesign(uploaded.storageURI, artworkHash, hash("ai-disclosure"), hash("provenance")));
  const submittedEvent = submitted.logs.map((log) => { try { return contracts.assetRegistry.interface.parseLog(log); } catch { return null; } }).find((event) => event?.name === "DesignSubmitted");
  const designId = submittedEvent.args.designId;
  proof.designId = designId.toString();

  await confirmed("lifecycle:verifyDesign", contracts.assetRegistry.connect(actors.verifier).verifyDesign(designId, hash("verification-report")));
  await confirmed("lifecycle:approveConceptEligibility", contracts.assetRegistry.connect(actors.publisher).approveConceptEligibility(designId, hash("publisher-review")));

  let now = Number((await hre.ethers.provider.getBlock("latest")).timestamp);
  const roundId = BigInt(Date.now());
  const voteStart = now + 15;
  const voteEnd = voteStart + 48;
  await confirmed("lifecycle:openVoting", contracts.voting.connect(actors.admin).openVoting(roundId, [designId], voteStart, voteEnd));
  await waitForTimestamp(voteStart);
  await confirmed("lifecycle:vote", contracts.voting.connect(actors.fan).vote(roundId, designId));
  await waitForTimestamp(voteEnd);
  await confirmed("lifecycle:finalizeVoting", contracts.voting.connect(actors.admin).finalizeVoting(roundId));
  await confirmed("lifecycle:recordAgreement", contracts.assetRegistry.connect(actors.publisher).recordAgreement(designId, hash("agreement"), 8000, 500));
  await confirmed("lifecycle:submitProduction", contracts.compatibility.connect(actors.publisher).submitProduction(designId, hash("production"), hash("compatibility"), "1.0.0-sepolia"));
  await confirmed("lifecycle:approveCompatibility", contracts.compatibility.connect(actors.gameTeam).approveCompatibility(designId, hash("approved-game"), 1));

  const fanBalance = await contracts.payment.balanceOf(actors.fan.address);
  const targetMockVnd = hre.ethers.parseEther("100");
  if (fanBalance < targetMockVnd) await confirmed("seed:fan-mock-vnd", contracts.payment.connect(actors.admin).mint(actors.fan.address, targetMockVnd - fanBalance));

  now = Number((await hre.ethers.provider.getBlock("latest")).timestamp);
  const auctionStart = now + 15;
  const auctionEnd = auctionStart + 48;
  const reserve = hre.ethers.parseEther("10");
  const increment = hre.ethers.parseEther("1");
  const auctionReceipt = await confirmed("lifecycle:createAuction", contracts.primary.connect(actors.publisher).createAuction(designId, reserve, increment, auctionStart, auctionEnd));
  const auctionEvent = auctionReceipt.logs.map((log) => { try { return contracts.primary.interface.parseLog(log); } catch { return null; } }).find((event) => event?.name === "AuctionCreated");
  const auctionId = auctionEvent.args.auctionId;
  proof.auctionId = auctionId.toString();
  await waitForTimestamp(auctionStart);
  await confirmed("lifecycle:approveBidToken", contracts.payment.connect(actors.fan).approve(deployment.contracts.primary, reserve));
  await confirmed("lifecycle:placeBid", contracts.primary.connect(actors.fan).placeBid(auctionId, reserve));
  await waitForTimestamp(auctionEnd);
  await confirmed("lifecycle:settleAuction", contracts.primary.connect(actors.admin).settle(auctionId));

  const design = await contracts.assetRegistry.getDesign(designId);
  const production = await contracts.compatibility.getProduction(designId);
  const auction = await contracts.primary.getAuction(auctionId);
  const entitlementBalance = await contracts.entitlement.balanceOf(actors.fan.address, designId);
  proof.finalState = {
    designStatus: Number(design.status),
    verified: design.verified,
    publisherEligible: design.publisherEligible,
    agreementRecorded: design.agreementRecorded,
    qaStatus: Number(production.qaStatus),
    maxSupply: production.maxSupply.toString(),
    auctionStatus: Number(auction.status),
    winner: auction.highestBidder,
    winningBid: auction.highestBid.toString(),
    entitlementBalance: entitlementBalance.toString(),
  };
  proof.result = proof.finalState.entitlementBalance === "1" ? "PASS" : "FAIL";
  proof.generatedAt = new Date().toISOString();
  await fs.mkdir(path.dirname(EVIDENCE_PATH), { recursive: true });
  await fs.writeFile(EVIDENCE_PATH, `${JSON.stringify(proof, null, 2)}\n`);
  console.log(`Lifecycle ${proof.result}. Evidence: ${EVIDENCE_PATH}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
