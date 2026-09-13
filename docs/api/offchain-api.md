# Kat Off Chain API

Base URL: `http://localhost:3000`. All JSON errors use:

```json
{ "code": "VALIDATION_ERROR", "message": "...", "recoverable": true }
```

The service stores detailed files and records locally. Blockchain contracts remain authoritative for ownership, lifecycle state, market eligibility, settlement, and BPS rules.

## File endpoints

### POST /api/files/upload

Multipart fields: `file`, `category`, and positive integer `designId`.

Allowed files are PNG, JPEG, WebP, PDF, and JSON up to 10 MiB. Extension and MIME type must agree; unsafe paths are rejected.

Example response:

```json
{
  "fileId": "concept-1-0967115f2813",
  "fileName": "skin-concept.png",
  "category": "concept",
  "designId": 1,
  "storageURI": "/uploads/concept-1-0967115f2813.png",
  "size": 481205,
  "mimeType": "image/png",
  "sha256": "0x0967115f2813a3541eaef77de9d9d5773f1c0c04314b0bbfe4ff3b3b1c55b5d5",
  "uploadedAt": 1788948000
}
```

Errors: `400 VALIDATION_ERROR` for missing fields, invalid type/size, or unsafe name.

### POST /api/files/hash

Send JSON content:

```json
{ "content": "same" }
```

or multipart form data with a `file` field. Response:

```json
{ "sha256": "0x0967115f2813a3541eaef77de9d9d5773f1c0c04314b0bbfe4ff3b3b1c55b5d5" }
```

Identical bytes always produce the same digest. Errors: `400 VALIDATION_ERROR`.

### GET /api/files/:id

Returns the stored metadata shown above. Errors: `400 VALIDATION_ERROR` for an invalid identifier and `404 NOT_FOUND` for a missing record.

## Verification endpoints

### POST /api/verification/pre-screen

Request:

```json
{
  "designId": 1,
  "aiUsed": true,
  "disclosureComplete": true,
  "evidenceFileIds": ["concept-design-0001", "creation-evidence-0001"]
}
```

Response:

```json
{
  "reportId": "verification-design-1-prescreen",
  "designId": 1,
  "aiUsed": true,
  "disclosureComplete": true,
  "similarityRisk": 22,
  "trademarkRisk": 8,
  "overallRisk": "LOW",
  "recommendedAction": "HUMAN_REVIEW",
  "findings": []
}
```

Rules: two evidence files produce 22/8, one produces 45/35, and none produces 75/70. Incomplete disclosure creates a 70 risk floor. `LOW` is 0-29, `MEDIUM` is 30-59, and `HIGH` is 60-100. Screening never proves ownership or makes the final legal decision.

### POST /api/verification/reports

The `automatedSummary` must exactly match the stored pre-screen.

```json
{
  "designId": 1,
  "automatedSummary": {
    "designId": 1,
    "aiUsed": true,
    "disclosureComplete": true,
    "similarityRisk": 22,
    "trademarkRisk": 8,
    "overallRisk": "LOW",
    "recommendedAction": "HUMAN_REVIEW",
    "findings": []
  },
  "decision": "APPROVED",
  "verifierAddress": "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
  "notes": "Mock human review completed"
}
```

The response adds a versioned `reportId`, deterministic `reviewedAt`, and SHA-256 `reportHash` for on-chain recording. Decisions are `APPROVED`, `REJECTED`, or `REVISION_REQUIRED`.

Errors: `400 VALIDATION_ERROR` for invalid input, a missing pre-screen, or a mismatched automated summary.

### GET /api/verification/reports/:designId

Returns the newest report for the design. Errors: `400 VALIDATION_ERROR` or `404 NOT_FOUND`.

## Production endpoints

### POST /api/production/records

Request:

```json
{
  "designId": 1,
  "productionStudio": "Authorised Demo Studio",
  "modelFileURI": "/mock-production/design-1-v1.glb",
  "approvedGame": "Demo MOBA"
}
```

The response adds `version`, `productionHash`, `compatibilityHash`, `qaStatus: "PENDING"`, and `createdAt`. Each submission creates `v1`, `v2`, and so on; content hashes are deterministic.

### POST /api/production/review

```json
{
  "designId": 1,
  "version": "v1",
  "qaStatus": "REWORK_REQUIRED",
  "reviewerAddress": "0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65",
  "notes": "Compatibility adjustment required"
}
```

Review states are `APPROVED`, `REWORK_REQUIRED`, and `REJECTED`. Resubmission after rework creates the next version. Errors: `400 VALIDATION_ERROR` or `404 NOT_FOUND`.

### GET /api/production/:designId

Response:

```json
{ "current": { "version": "v2" }, "history": [{ "version": "v1" }, { "version": "v2" }] }
```

Full records are returned in both fields. Errors: `400 VALIDATION_ERROR` or `404 NOT_FOUND`.

## Reset and limitations

Tests may import and call `resetAllCollections()` from `lib/server/storage.ts`. No public reset route is exposed because it is not part of the frozen API contract.

Storage is for a single local process. It has no database transaction isolation, malware scanner, authentication, real KYC, real AI classifier, legal determination, proprietary asset store, or publisher integration.
