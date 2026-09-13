import { copyFile, mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";

const baseUrl = process.env.KAT_API_BASE_URL ?? "http://localhost:3000";
const outputDirectory = path.resolve("docs/integration/evidence");
const buyerB = "0x23618e81E3f5cdF7f54C3d65f7FBc0aBf5B21E8f";
const buyerC = "0xa0Ee7A142d267C1f36714E4a8F75612F20a79720";
const verifier = "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC";
const productionReviewer = "0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65";
const mintTransactionHash = `0x${"1".repeat(64)}`;
const transferTransactionHash = `0x${"2".repeat(64)}`;
const results = [];
const logLines = [];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function hasStandardErrorShape(body) {
  return (
    body &&
    typeof body.code === "string" &&
    typeof body.message === "string" &&
    typeof body.recoverable === "boolean"
  );
}

async function resetData() {
  const seedDirectory = path.resolve("data/seeds");
  for (const fileName of await readdir(seedDirectory)) {
    if (fileName.endsWith(".json")) {
      await copyFile(path.join(seedDirectory, fileName), path.resolve("data", fileName));
    }
  }
}

async function request(name, method, route, options = {}) {
  const startedAt = new Date().toISOString();
  const headers = { ...(options.headers ?? {}) };
  let body;
  if (options.json !== undefined) {
    headers["content-type"] = "application/json";
    body = JSON.stringify(options.json);
  } else if (options.form) {
    body = options.form;
  }

  const response = await fetch(`${baseUrl}${route}`, { method, headers, body });
  const contentType = response.headers.get("content-type") ?? "";
  const responseBody = contentType.includes("application/json")
    ? await response.json()
    : await response.text();
  const record = {
    name,
    method,
    route,
    status: response.status,
    startedAt,
    finishedAt: new Date().toISOString(),
    response: responseBody,
  };
  results.push(record);
  logLines.push(`${record.finishedAt} ${method} ${route} ${response.status} ${name}`);
  return record;
}

async function expectStatus(record, expected) {
  assert(record.status === expected, `${record.name}: expected ${expected}, received ${record.status}`);
  return record.response;
}

async function run() {
  await resetData();
  await mkdir(outputDirectory, { recursive: true });

  const hash1 = await expectStatus(
    await request("Hash JSON content", "POST", "/api/files/hash", { json: { content: "same" } }),
    200,
  );
  assert(/^0x[0-9a-f]{64}$/.test(hash1.sha256), "Hash JSON content: invalid SHA-256");

  const uploadForm = new FormData();
  uploadForm.set("file", new File([new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10])], "skin-concept.png", { type: "image/png" }));
  uploadForm.set("category", "concept-design");
  uploadForm.set("designId", "1");
  const uploaded = await expectStatus(
    await request("Upload file", "POST", "/api/files/upload", { form: uploadForm }),
    201,
  );
  assert(uploaded.sha256 === hash1.sha256 || /^0x[0-9a-f]{64}$/.test(uploaded.sha256), "Upload file: invalid SHA-256");

  const metadata = await expectStatus(
    await request("Get uploaded file metadata", "GET", `/api/files/${uploaded.fileId}`),
    200,
  );
  assert(metadata.fileId === uploaded.fileId && metadata.sha256 === uploaded.sha256, "File metadata mismatch");

  const preScreenInput = {
    designId: 1,
    aiUsed: true,
    disclosureComplete: true,
    evidenceFileIds: ["concept-design-0001", "creation-evidence-0001"],
  };
  const preScreen = await expectStatus(
    await request("Pre-screen design", "POST", "/api/verification/pre-screen", { json: preScreenInput }),
    201,
  );
  assert(preScreen.overallRisk === "LOW" && preScreen.recommendedAction === "HUMAN_REVIEW", "Unexpected pre-screen result");

  const humanReport = await expectStatus(
    await request("Record human verification", "POST", "/api/verification/reports", {
      json: {
        designId: 1,
        automatedSummary: {
          designId: preScreen.designId,
          aiUsed: preScreen.aiUsed,
          disclosureComplete: preScreen.disclosureComplete,
          similarityRisk: preScreen.similarityRisk,
          trademarkRisk: preScreen.trademarkRisk,
          overallRisk: preScreen.overallRisk,
          recommendedAction: preScreen.recommendedAction,
          findings: preScreen.findings,
        },
        decision: "APPROVED",
        verifierAddress: verifier,
        notes: "Integration acceptance human review",
      },
    }),
    201,
  );
  assert(humanReport.decision === "APPROVED" && /^0x[0-9a-f]{64}$/.test(humanReport.reportHash), "Human verification result invalid");

  const latestVerification = await expectStatus(
    await request("Get latest verification", "GET", "/api/verification/reports/1"),
    200,
  );
  assert(latestVerification.reportId === humanReport.reportId, "Verification report did not persist");

  const productionV1 = await expectStatus(
    await request("Create production v1", "POST", "/api/production/records", {
      json: { designId: 1, productionStudio: "Authorised Demo Studio", modelFileURI: "/mock-production/design-1-v1.glb", approvedGame: "Demo MOBA" },
    }),
    201,
  );
  assert(productionV1.version === "v1" && productionV1.qaStatus === "PENDING", "Production v1 invalid");

  const reviewedV1 = await expectStatus(
    await request("Review production v1", "POST", "/api/production/review", {
      json: { designId: 1, version: "v1", qaStatus: "REWORK_REQUIRED", reviewerAddress: productionReviewer, notes: "Compatibility adjustment required" },
    }),
    200,
  );
  assert(reviewedV1.qaStatus === "REWORK_REQUIRED", "Production review did not persist");

  const productionV2 = await expectStatus(
    await request("Create production v2", "POST", "/api/production/records", {
      json: { designId: 1, productionStudio: "Authorised Demo Studio", modelFileURI: "/mock-production/design-1-v2.glb", approvedGame: "Demo MOBA" },
    }),
    201,
  );
  assert(productionV2.version === "v2", "Production v2 did not increment version");

  const productionHistory = await expectStatus(
    await request("Get production history", "GET", "/api/production/1"),
    200,
  );
  assert(productionHistory.current.version === "v2" && productionHistory.history.length === 2, "Production history invalid");

  const accountB = await expectStatus(
    await request("Link account", "POST", "/api/accounts/link", { json: { walletAddress: buyerB, gameAccountId: "moba-player-b" } }),
    201,
  );
  assert(accountB.status === "LINKED", "Buyer B account link invalid");

  const accountLookup = await expectStatus(
    await request("Get linked account", "GET", `/api/accounts/${buyerB}`),
    200,
  );
  assert(accountLookup.gameAccountId === "moba-player-b", "Buyer B account lookup mismatch");

  const mintEvidence = { transactionHash: mintTransactionHash, eventName: "EntitlementMinted", designId: 1, tokenId: 1, amount: 1, owner: buyerB };
  const buyerBActivation = await expectStatus(
    await request("Activate Buyer B from mint", "POST", "/api/game/activate", { json: { evidence: mintEvidence } }),
    201,
  );
  assert(buyerBActivation.status === "ACTIVE", "Buyer B did not become ACTIVE");

  const transferEvidence = { transactionHash: transferTransactionHash, eventName: "EntitlementTransferred", designId: 1, tokenId: 1, amount: 1, previousOwner: buyerB, newOwner: buyerC };
  const buyerBRevocation = await expectStatus(
    await request("Revoke Buyer B from transfer", "POST", "/api/game/revoke", { json: { evidence: transferEvidence } }),
    201,
  );
  assert(buyerBRevocation.status === "REVOKED", "Buyer B did not become REVOKED");

  const buyerCPending = await expectStatus(
    await request("Activate Buyer C from transfer pending once", "POST", "/api/game/activate", { json: { evidence: transferEvidence } }),
    201,
  );
  assert(buyerCPending.status === "DELIVERY_PENDING" && buyerCPending.attemptCount === 1, "Buyer C did not enter DELIVERY_PENDING");
  assert(buyerBRevocation.createdAt < buyerCPending.createdAt, "Buyer B was not revoked before Buyer C activation");

  const buyerCActive = await expectStatus(
    await request("Retry Buyer C delivery", "POST", "/api/game/retry", { json: { activationId: buyerCPending.activationId } }),
    200,
  );
  assert(buyerCActive.activationId === buyerCPending.activationId && buyerCActive.status === "ACTIVE" && buyerCActive.attemptCount === 2, "Retry did not update the same activation record");

  const buyerBStatus = await expectStatus(
    await request("Get Buyer B status", "GET", `/api/game/status/${buyerB}/1`),
    200,
  );
  assert(buyerBStatus.status === "REVOKED", "Buyer B final status is not REVOKED");

  const buyerCStatus = await expectStatus(
    await request("Get Buyer C status", "GET", `/api/game/status/${buyerC}/1`),
    200,
  );
  assert(buyerCStatus.status === "ACTIVE" && buyerCStatus.activationId === buyerCPending.activationId, "Buyer C final status is not ACTIVE");

  const hash2 = await expectStatus(
    await request("Extra deterministic hash check", "POST", "/api/files/hash", { json: { content: "same" } }),
    200,
  );
  assert(hash2.sha256 === hash1.sha256, "SHA-256 is not deterministic for identical input");

  const redelivery = await expectStatus(
    await request("Extra mint redelivery idempotency", "POST", "/api/game/activate", { json: { evidence: mintEvidence } }),
    201,
  );
  assert(redelivery.activationId === buyerBActivation.activationId, "Mint redelivery created a duplicate activation");

  const accountIdempotency = await expectStatus(
    await request("Extra account link idempotency", "POST", "/api/accounts/link", { json: { walletAddress: buyerB, gameAccountId: "moba-player-b" } }),
    201,
  );
  assert(accountIdempotency.linkedAt === accountB.linkedAt, "Account relinking was not idempotent");

  const accountConflict = await request("Extra account conflict", "POST", "/api/accounts/link", { json: { walletAddress: buyerB, gameAccountId: "moba-player-other" } });
  assert(accountConflict.status === 409 && hasStandardErrorShape(accountConflict.response), "Account conflict error shape invalid");

  const invalidTypeForm = new FormData();
  invalidTypeForm.set("file", new File(["plain text"], "not-allowed.txt", { type: "text/plain" }));
  invalidTypeForm.set("category", "concept-design");
  invalidTypeForm.set("designId", "1");
  const invalidType = await request("Extra invalid file type", "POST", "/api/files/upload", { form: invalidTypeForm });
  assert(invalidType.status === 400 && hasStandardErrorShape(invalidType.response), "Invalid type error shape invalid");

  const oversizeForm = new FormData();
  oversizeForm.set("file", new File([new Uint8Array(10 * 1024 * 1024 + 1)], "oversize.png", { type: "image/png" }));
  oversizeForm.set("category", "concept-design");
  oversizeForm.set("designId", "1");
  const oversize = await request("Extra oversize file", "POST", "/api/files/upload", { form: oversizeForm });
  assert(oversize.status === 400 && hasStandardErrorShape(oversize.response), "Oversize error shape invalid");

  const unknownFile = await request("Extra unknown file ID", "GET", "/api/files/unknown-file-id");
  assert(unknownFile.status === 404 && hasStandardErrorShape(unknownFile.response), "Unknown file error shape invalid");

  const report = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    baseUrl,
    collectionPath: "docs/api/postman_collection.json",
    primaryFlow: { total: 18, passed: 18, failed: 0 },
    additionalAssertions: { total: results.length - 18, passed: results.length - 18, failed: 0 },
    assertions: {
      deterministicSha256: true,
      validationErrorsUseStandardShape: true,
      reportPersistence: true,
      productionVersionHistory: true,
      accountLinkIdempotencyAndConflictDetection: true,
      buyerBActiveAfterMint: true,
      mintRedeliveryIdempotent: true,
      buyerBRevokedBeforeBuyerCActivation: true,
      buyerCPendingThenActiveOnSameRecord: true,
    },
    evidenceClassification: "Deterministic mock receipt evidence; not real on-chain transaction proof",
    results,
  };
  await writeFile(path.join(outputDirectory, "kat-api-results.json"), `${JSON.stringify(report, null, 2)}\n`);
  await writeFile(path.join(outputDirectory, "kat-api-run.log"), `${logLines.join("\n")}\n`);
  await resetData();
  console.log(`PASS ${results.length} HTTP checks (${report.primaryFlow.total} collection requests plus ${report.additionalAssertions.total} additional assertions)`);
}

run().catch(async (error) => {
  await mkdir(outputDirectory, { recursive: true });
  const failure = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    baseUrl,
    failure: error instanceof Error ? error.message : String(error),
    results,
  };
  await writeFile(path.join(outputDirectory, "kat-api-results.json"), `${JSON.stringify(failure, null, 2)}\n`);
  await writeFile(path.join(outputDirectory, "kat-api-run.log"), `${logLines.join("\n")}\nFAIL ${failure.failure}\n`);
  await resetData().catch(() => {});
  console.error(error);
  process.exitCode = 1;
});
