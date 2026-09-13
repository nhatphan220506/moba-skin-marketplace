const fs = require("node:fs/promises");
const path = require("node:path");
const { ethers, network } = require("hardhat");
const { deploySystem, hash, writeDeployment } = require("./lib/system");

const API = process.env.KAT_API_BASE_URL || "http://127.0.0.1:3000";
const DESIGN_ID = 1n;
const ROUND_ID = 1n;
const TOKEN_ID = 1n;

const jsonSafe = (value) => JSON.parse(JSON.stringify(value, (_, item) => typeof item === "bigint" ? item.toString() : item));

async function api(route, method = "GET", body) {
  const response = await fetch(`${API}${route}`, {
    method,
    headers: body === undefined ? undefined : { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(`${route}: ${payload.code || response.status} ${payload.message || "request failed"}`);
  return payload;
}

async function resetKatData() {
  const dataDir = path.join(process.cwd(), "data");
  for (const name of ["account-links", "activations", "creators", "designs", "files", "production-records", "verification-reports"]) {
    await fs.copyFile(path.join(dataDir, "seeds", `${name}.json`), path.join(dataDir, `${name}.json`));
  }
}

function eventActor(parsed, fallback) {
  for (const key of ["artist", "verifier", "publisher", "voter", "bidder", "winner", "owner", "seller", "buyer", "previousOwner", "gameDeveloper", "recipient"]) {
    if (parsed.args[key] && typeof parsed.args[key] === "string" && parsed.args[key].startsWith("0x")) return parsed.args[key];
  }
  return fallback;
}

async function decodeReceipt(receipt, contracts) {
  const addresses = new Map();
  for (const [name, contract] of Object.entries(contracts)) addresses.set((await contract.getAddress()).toLowerCase(), [name, contract.interface]);
  const block = await ethers.provider.getBlock(receipt.blockNumber);
  const decoded = [];
  for (let index = 0; index < receipt.logs.length; index += 1) {
    const log = receipt.logs[index];
    const entry = addresses.get(log.address.toLowerCase());
    if (!entry) continue;
    try {
      const parsed = entry[1].parseLog(log);
      if (!parsed) continue;
      const args = {};
      parsed.fragment.inputs.forEach((input, argIndex) => { args[input.name] = jsonSafe(parsed.args[argIndex]); });
      decoded.push({
        transactionHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        logIndex: index,
        contractName: entry[0],
        contractAddress: log.address,
        eventName: parsed.name,
        actor: eventActor(parsed, receipt.from),
        designId: args.designId,
        auctionId: args.auctionId,
        tokenId: args.tokenId,
        amount: args.amount || args.finalPrice || args.price,
        timestamp: Number(block.timestamp),
        args,
      });
    } catch { /* ERC-20/ERC-1155 inherited events are optional evidence. */ }
  }
  return decoded;
}

async function main() {
  await resetKatData();
  const { actors, contracts } = await deploySystem(ethers);
  const { admin, artist, verifier, publisher, gameDeveloper, fanA, fanB, buyerA, buyerB, buyerC,
    publisherTreasury, marketplaceTreasury } = actors;
  const { payment, assetRegistry, voting, compatibility, entitlement, primary, secondary } = contracts;
  const chain = await ethers.provider.getNetwork();
  const deployment = await writeDeployment(contracts, chain.chainId);
  const steps = [];
  const evidence = [];
  let mintEvent;
  let transferEvent;

  async function txStep(number, actor, role, action, service, stateBefore, stateAfter, txPromise, amount) {
    const tx = await txPromise;
    const receipt = await tx.wait();
    if (!receipt || receipt.status !== 1) throw new Error(`Step ${number} transaction failed`);
    const decoded = await decodeReceipt(receipt, contracts);
    evidence.push(...decoded);
    steps.push({ number, actor: actor.address || actor, role, action, service, transactionHash: receipt.hash,
      blockNumber: receipt.blockNumber, decodedEvents: decoded, stateBefore, stateAfter, amount: amount?.toString(),
      classification: "ON_CHAIN", result: "PASS" });
    return { receipt, decoded };
  }

  const uploadForm = new FormData();
  uploadForm.set("category", "concept-design");
  uploadForm.set("designId", "1");
  uploadForm.set("file", new Blob([Buffer.from("89504e470d0a1a0a0000000d49484452", "hex")], { type: "image/png" }), "design-1.png");
  const uploadResponse = await fetch(`${API}/api/files/upload`, { method: "POST", body: uploadForm });
  const uploaded = await uploadResponse.json();
  if (!uploadResponse.ok) throw new Error(`file upload failed: ${uploaded.message}`);
  const artworkHash = uploaded.sha256.startsWith("0x") ? uploaded.sha256 : `0x${uploaded.sha256}`;
  const s1 = await txStep(1, artist, "ARTIST", "submitDesign", "AssetRegistry", "DRAFT", "SUBMITTED",
    assetRegistry.connect(artist).submitDesign(uploaded.storageURI, artworkHash, hash(ethers, "ai-disclosure"), hash(ethers, "provenance")));
  if (!s1.decoded.some((event) => event.eventName === "DesignSubmitted")) throw new Error("Step 1 missing DesignSubmitted");

  const automatedSummary = await api("/api/verification/pre-screen", "POST", { designId: 1, aiUsed: true, disclosureComplete: true,
    evidenceFileIds: [uploaded.fileId, "creation-evidence-0001"] });
  const { reportId: ignoredReportId, decision: ignoredDecision, verifierAddress: ignoredVerifier,
    reportHash: ignoredReportHash, reviewedAt: ignoredReviewedAt, ...storedAutomatedSummary } = automatedSummary;
  const report = await api("/api/verification/reports", "POST", { designId: 1,
    automatedSummary: storedAutomatedSummary,
    decision: "APPROVED", verifierAddress: verifier.address, notes: "Human verification for deterministic demo" });
  await txStep(2, verifier, "VERIFIER", "verifyDesign", "AssetRegistry + Kat verification", "SUBMITTED", "VERIFIED",
    assetRegistry.connect(verifier).verifyDesign(DESIGN_ID, report.reportHash));
  await txStep(3, publisher, "PUBLISHER", "approveConceptEligibility", "AssetRegistry", "VERIFIED", "VOTING_ELIGIBLE",
    assetRegistry.connect(publisher).approveConceptEligibility(DESIGN_ID, hash(ethers, "publisher-review")));

  let now = Number((await ethers.provider.getBlock("latest")).timestamp);
  const voteStart = now + 2;
  const voteEnd = now + 30;
  await txStep(4, admin, "ADMIN", "openVoting", "CommunityVoting", "VOTING_ELIGIBLE", "VOTING",
    voting.openVoting(ROUND_ID, [DESIGN_ID], voteStart, voteEnd));
  await network.provider.send("evm_setNextBlockTimestamp", [voteStart]);
  await network.provider.send("evm_mine");
  await txStep(5, fanA, "FAN", "vote", "CommunityVoting", "NOT_VOTED", "VOTED",
    voting.connect(fanA).vote(ROUND_ID, DESIGN_ID));
  await txStep(6, fanB, "FAN", "vote", "CommunityVoting", "NOT_VOTED", "VOTED",
    voting.connect(fanB).vote(ROUND_ID, DESIGN_ID));
  await network.provider.send("evm_setNextBlockTimestamp", [voteEnd]);
  await network.provider.send("evm_mine");
  await txStep(7, admin, "ADMIN", "finalizeVoting", "CommunityVoting", "VOTING", "SELECTED",
    voting.finalizeVoting(ROUND_ID));
  await txStep(8, publisher, "PUBLISHER", "recordAgreement", "AssetRegistry", "SELECTED", "AGREEMENT_RECORDED",
    assetRegistry.connect(publisher).recordAgreement(DESIGN_ID, hash(ethers, "agreement"), 8000, 500));

  const production = await api("/api/production/records", "POST", { designId: 1, productionStudio: "Authorised Demo Studio",
    modelFileURI: "/mock-production/design-1-v1.glb", approvedGame: "Demo MOBA" });
  steps.push({ number: 9, actor: publisher.address, role: "PUBLISHER", action: "POST /api/production/records", service: "Kat production API",
    stateBefore: "NO_PRODUCTION", stateAfter: `VERSION_${production.version}`, classification: "OFF_CHAIN", result: "PASS", offchainEvidence: production });

  const prodTx = await compatibility.connect(publisher).submitProduction(DESIGN_ID, production.productionHash, production.compatibilityHash, String(production.version));
  const prodReceipt = await prodTx.wait(); evidence.push(...await decodeReceipt(prodReceipt, contracts));
  const qa = await api("/api/production/review", "POST", { designId: 1, version: production.version, qaStatus: "APPROVED",
    reviewerAddress: gameDeveloper.address, notes: "Compatibility approved" });
  const s10 = await txStep(10, gameDeveloper, "GAME_DEVELOPER", "submitProduction + approveCompatibility(maxSupply=1)",
    "CompatibilityRegistry + Kat QA", "TECHNICAL_REVIEW", "MARKET_READY",
    compatibility.connect(gameDeveloper).approveCompatibility(DESIGN_ID, hash(ethers, "approved-game"), 1n), "1");
  s10.decoded.unshift(...await decodeReceipt(prodReceipt, contracts));
  steps[steps.length - 1].offchainEvidence = qa;

  now = Number((await ethers.provider.getBlock("latest")).timestamp);
  const auctionStart = now + 2;
  const auctionEnd = now + 30;
  await txStep(11, publisher, "PUBLISHER", "createAuction", "PrimaryAuction", "MARKET_READY", "AUCTION_OPEN",
    primary.connect(publisher).createAuction(DESIGN_ID, 100n, 10n, auctionStart, auctionEnd), "100");
  await network.provider.send("evm_setNextBlockTimestamp", [auctionStart]);
  await network.provider.send("evm_mine");

  await (await payment.mint(buyerA.address, 1000n)).wait();
  await (await payment.mint(buyerB.address, 1000n)).wait();
  await (await payment.mint(buyerC.address, 1000n)).wait();
  const approveA = await (await payment.connect(buyerA).approve(await primary.getAddress(), 120n)).wait();
  const s12 = await txStep(12, buyerA, "BUYER_SELLER", "approve MockVND + placeBid", "MockVND + PrimaryAuction", "BALANCE_1000", "ESCROW_120",
    primary.connect(buyerA).placeBid(1n, 120n), "120");
  steps[steps.length - 1].transactionHashes = [approveA.hash, s12.receipt.hash];
  const approveB = await (await payment.connect(buyerB).approve(await primary.getAddress(), 150n)).wait();
  const s13 = await txStep(13, buyerB, "BUYER_SELLER", "approve MockVND + placeBid", "MockVND + PrimaryAuction", "HIGHEST_120", "HIGHEST_150",
    primary.connect(buyerB).placeBid(1n, 150n), "150");
  steps[steps.length - 1].transactionHashes = [approveB.hash, s13.receipt.hash];
  if (await primary.pendingReturns(1n, buyerA.address) !== 120n) throw new Error("Buyer A pending refund mismatch");
  await txStep(14, buyerA, "BUYER_SELLER", "withdrawRefund", "PrimaryAuction", "PENDING_REFUND_120", "REFUNDED_120",
    primary.connect(buyerA).withdrawRefund(1n), "120");
  if (await payment.balanceOf(buyerA.address) !== 1000n) throw new Error("Buyer A refund balance mismatch");
  await network.provider.send("evm_setNextBlockTimestamp", [auctionEnd]);
  await network.provider.send("evm_mine");
  const settled = await txStep(15, admin, "ADMIN", "settle", "PrimaryAuction", "ESCROW_150", "SETTLED_ENTITLEMENT_ISSUED",
    primary.settle(1n), "150");
  mintEvent = settled.decoded.find((event) => event.eventName === "EntitlementMinted");
  if (!mintEvent) throw new Error("Step 15 missing EntitlementMinted receipt evidence");

  const primaryExpected = [[artist, 120n], [publisherTreasury, 15n], [marketplaceTreasury, 15n]];
  for (const [recipient, expected] of primaryExpected) if (await primary.pendingProceeds(recipient.address) !== expected) throw new Error("Primary split mismatch");
  const primaryWithdrawals = [];
  for (const [recipient] of primaryExpected) primaryWithdrawals.push((await (await primary.connect(recipient).withdrawProceeds()).wait()).hash);
  steps.push({ number: 16, actor: admin.address, role: "ACCOUNTING_ASSERTION", action: "verify and withdraw primary proceeds",
    service: "PrimaryAuction + MockVND", transactionHashes: primaryWithdrawals, stateBefore: "PENDING_120_15_15", stateAfter: "PAID_120_15_15",
    amount: "150", classification: "ON_CHAIN", result: "PASS", accounting: { artist: "120", publisher: "15", marketplace: "15" } });

  await api("/api/accounts/link", "POST", { walletAddress: buyerB.address, gameAccountId: "moba-player-b" });
  await api("/api/accounts/link", "POST", { walletAddress: buyerC.address, gameAccountId: "moba-player-c-pending-once" });
  const mintEvidence = { transactionHash: mintEvent.transactionHash, eventName: "EntitlementMinted", designId: 1, tokenId: 1, amount: 1, owner: buyerB.address };
  const activeB = await api("/api/game/activate", "POST", { evidence: mintEvidence });
  const replayB = await api("/api/game/activate", "POST", { evidence: mintEvidence });
  if (activeB.status !== "ACTIVE" || activeB.activationId !== replayB.activationId) throw new Error("Step 17 activation/idempotency failed");
  steps.push({ number: 17, actor: buyerB.address, role: "BUYER_SELLER", action: "sync EntitlementMinted -> activate",
    service: "Kat game API", transactionHash: mintEvent.transactionHash, blockNumber: mintEvent.blockNumber, decodedEvents: [mintEvent],
    stateBefore: "NOT_ACTIVATED", stateAfter: "ACTIVE", classification: "OFF_CHAIN_LINKED_TO_CHAIN", result: "PASS", offchainEvidence: activeB });

  await txStep(18, buyerB, "BUYER_SELLER", "listForResale", "SecondaryMarketplace", "OWNED_ACTIVE", "LISTED_200",
    secondary.connect(buyerB).listForResale(DESIGN_ID, TOKEN_ID, 200n), "200");
  const approveC = await (await payment.connect(buyerC).approve(await secondary.getAddress(), 200n)).wait();
  const purchased = await txStep(19, buyerC, "BUYER_SELLER", "approve MockVND + buyResale", "MockVND + SecondaryMarketplace",
    "LISTED_200", "PURCHASED_INACTIVE", secondary.connect(buyerC).buyResale(1n), "200");
  steps[steps.length - 1].transactionHashes = [approveC.hash, purchased.receipt.hash];
  transferEvent = purchased.decoded.find((event) => event.eventName === "EntitlementTransferred");
  if (!transferEvent) throw new Error("Step 19 missing EntitlementTransferred receipt evidence");

  const resaleExpected = [[buyerB, 180n], [artist, 10n], [publisherTreasury, 6n], [marketplaceTreasury, 4n]];
  const resaleWithdrawals = [];
  for (const [recipient, expected] of resaleExpected) {
    const before = await payment.balanceOf(recipient.address);
    resaleWithdrawals.push((await (await secondary.connect(recipient).withdrawProceeds()).wait()).hash);
    if ((await payment.balanceOf(recipient.address)) - before !== expected) throw new Error("Resale split mismatch");
  }
  steps.push({ number: 20, actor: admin.address, role: "ACCOUNTING_ASSERTION", action: "verify and withdraw resale proceeds",
    service: "SecondaryMarketplace + MockVND", transactionHashes: resaleWithdrawals, stateBefore: "PENDING_180_10_6_4", stateAfter: "PAID_180_10_6_4",
    amount: "200", classification: "ON_CHAIN", result: "PASS", accounting: { seller: "180", artist: "10", publisher: "6", marketplace: "4" } });

  const listing = await secondary.getListing(1n);
  const ownerB = await entitlement.balanceOf(buyerB.address, TOKEN_ID);
  const ownerC = await entitlement.balanceOf(buyerC.address, TOKEN_ID);
  if (ownerB !== 0n || ownerC !== 1n || listing.active) throw new Error("Step 21 ownership/listing invariant failed");
  let repurchaseBlocked = false;
  try { await secondary.connect(buyerA).buyResale(1n); } catch { repurchaseBlocked = true; }
  if (!repurchaseBlocked) throw new Error("Inactive listing was repurchased");
  steps.push({ number: 21, actor: buyerC.address, role: "BUYER_SELLER", action: "verify entitlement ownership and inactive listing",
    service: "SkinEntitlement1155 + SecondaryMarketplace", transactionHash: transferEvent.transactionHash, blockNumber: transferEvent.blockNumber,
    decodedEvents: [transferEvent], stateBefore: "BUYER_B_1_BUYER_C_0", stateAfter: "BUYER_B_0_BUYER_C_1_LISTING_INACTIVE",
    amount: "1", classification: "ON_CHAIN", result: "PASS", repurchaseBlocked });

  const transferEvidence = { transactionHash: transferEvent.transactionHash, eventName: "EntitlementTransferred", designId: 1, tokenId: 1,
    amount: 1, previousOwner: buyerB.address, newOwner: buyerC.address };
  const revokedB = await api("/api/game/revoke", "POST", { evidence: transferEvidence });
  const pendingC = await api("/api/game/activate", "POST", { evidence: transferEvidence });
  if (revokedB.status !== "REVOKED" || pendingC.status !== "DELIVERY_PENDING") throw new Error("Step 22 transfer sync pre-retry failed");
  const activeC = await api("/api/game/retry", "POST", { activationId: pendingC.activationId });
  const replayTransfer = await api("/api/game/activate", "POST", { evidence: transferEvidence });
  if (activeC.status !== "ACTIVE" || activeC.activationId !== pendingC.activationId || replayTransfer.activationId !== pendingC.activationId) {
    throw new Error("Step 22 retry/idempotency failed");
  }
  steps.push({ number: 22, actor: buyerC.address, role: "BUYER_SELLER", action: "revoke Buyer B, activate Buyer C, retry pending delivery",
    service: "Kat game API", transactionHash: transferEvent.transactionHash, blockNumber: transferEvent.blockNumber, decodedEvents: [transferEvent],
    stateBefore: "BUYER_B_ACTIVE_BUYER_C_NONE", stateAfter: "BUYER_B_REVOKED_BUYER_C_ACTIVE", classification: "OFF_CHAIN_LINKED_TO_CHAIN",
    result: "PASS", offchainEvidence: { revokedB, pendingC, activeC } });

  if (steps.length !== 22 || steps.some((step, index) => step.number !== index + 1 || step.result !== "PASS")) throw new Error("Mandatory step coverage failed");
  const final = {
    generatedAt: new Date().toISOString(), network: { name: network.name, chainId: Number(chain.chainId) }, deployment,
    result: "PASS", completedSteps: 22, totalSteps: 22, steps,
    evidence: evidence.sort((a, b) => a.blockNumber - b.blockNumber || a.logIndex - b.logIndex),
    finalState: { owner: buyerC.address, buyerBEntitlement: "0", buyerCEntitlement: "1", buyerBGameAccess: "REVOKED",
      buyerCGameAccess: "ACTIVE", listingActive: false, manualDataCorrection: false },
    accounting: { buyerABidDeduction: "120", buyerARefund: "120", auctionEscrowBeforeSettlement: "150",
      primary: { artist: "120", publisher: "15", marketplace: "15" }, resale: { seller: "180", artist: "10", publisher: "6", marketplace: "4" } },
  };
  const statePath = path.join(process.cwd(), "scripts", "demo", ".state", "journey.json");
  const evidencePath = path.join(process.cwd(), "docs", "integration", "evidence", "full-journey.json");
  await fs.mkdir(path.dirname(statePath), { recursive: true });
  await fs.mkdir(path.dirname(evidencePath), { recursive: true });
  await fs.writeFile(statePath, `${JSON.stringify(jsonSafe(final), null, 2)}\n`);
  await fs.writeFile(evidencePath, `${JSON.stringify(jsonSafe(final), null, 2)}\n`);
  console.log(`FULL JOURNEY PASS ${final.completedSteps}/${final.totalSteps}`);
  console.log(`Buyer B access: ${final.finalState.buyerBGameAccess}`);
  console.log(`Buyer C access: ${final.finalState.buyerCGameAccess}`);
}

main().catch((error) => { console.error("FULL JOURNEY FAIL", error); process.exitCode = 1; });
