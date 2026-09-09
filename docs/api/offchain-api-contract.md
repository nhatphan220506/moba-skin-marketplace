# Kat off-chain API contract

Owner: Kat  
Interface approver: Nhật  
QA consumer: Văn

These are the minimum request/response shapes. Kat may add internal fields but must not rename or remove frozen fields without a change request.

## Common error

```json
{
  "code": "VALIDATION_ERROR",
  "message": "designId is required",
  "recoverable": true,
  "details": {}
}
```

## File upload and hashing

### `POST /api/files/upload`

Multipart input: `file`, `category`, `designId`.

```json
{
  "fileId": "concept-design-0001",
  "fileName": "skin-concept.png",
  "storageURI": "/uploads/skin-concept.png",
  "size": 481205,
  "sha256": "0xabc123",
  "uploadedAt": 1788948000
}
```

Acceptance: path traversal is rejected; type and size are validated; identical bytes return the same SHA-256 hash.

### `POST /api/files/hash`

Returns `{ "sha256": "0x..." }` for a supplied file or content.

### `GET /api/files/:id`

Returns metadata or the stored mock file. Missing ID returns an explicit 404.

## Verification

### `POST /api/verification/pre-screen`

```json
{
  "designId": 1,
  "aiUsed": true,
  "disclosureComplete": true,
  "evidenceFileIds": ["concept-design-0001", "creation-evidence-0001"]
}
```

```json
{
  "designId": 1,
  "similarityRisk": 22,
  "trademarkRisk": 8,
  "overallRisk": "LOW",
  "recommendedAction": "HUMAN_REVIEW",
  "findings": []
}
```

Scores use deterministic demo rules so the same seed always produces the same result.

### `POST /api/verification/reports`

Input contains designId, automated summary, human decision, verifier address and notes. Output includes:

```json
{
  "reportId": "verification-design-1-v1",
  "designId": 1,
  "decision": "APPROVED",
  "verifierAddress": "0x0000000000000000000000000000000000000003",
  "reportHash": "0xdef456",
  "reviewedAt": 1788949000
}
```

The full report remains off-chain. Nhật sends `reportHash` to `AssetRegistry.verifyDesign`.

## Production record

```ts
interface ProductionRecord {
  designId: number;
  version: string;
  productionStudio: string;
  modelFileURI: string;
  productionHash: `0x${string}`;
  compatibilityHash: `0x${string}`;
  qaStatus: "PENDING" | "APPROVED" | "REWORK_REQUIRED" | "REJECTED";
  approvedGame: string;
}
```

- `POST /api/production/records`: create or version the record.
- `POST /api/production/review`: store QA status and notes.
- `GET /api/production/:designId`: return current version and history.

This service records a mock publisher/authorised-studio production outcome. It does not generate a 3D model.

## Account linking

### `POST /api/accounts/link`

```json
{
  "walletAddress": "0x0000000000000000000000000000000000000009",
  "gameAccountId": "moba-player-b"
}
```

Returns the frozen `AccountLink` shape. Do not store passwords, session tokens or identity documents.

## Mock game adapter

### `POST /api/game/activate`

```json
{
  "walletAddress": "0x0000000000000000000000000000000000000009",
  "gameAccountId": "moba-player-b",
  "designId": 1,
  "tokenId": 1,
  "transactionHash": "0xminttx"
}
```

Returns an `ActivationRecord` with `ACTIVE` or `DELIVERY_PENDING`.

### `POST /api/game/revoke`

Receives old wallet/account, designId, tokenId and resale transaction hash. Returns `REVOKED` or `DELIVERY_PENDING`.

### `POST /api/game/retry`

Receives `activationId`. Updates the existing record; it must not create a duplicate.

### `GET /api/game/status/:wallet/:designId`

Returns the latest access state.

## Idempotency

The idempotency key is:

```text
transactionHash + action + designId + tokenId
```

Repeated delivery of the same blockchain event returns the original record. On resale, a failed new-owner activation does not roll back blockchain ownership. Store `DELIVERY_PENDING`, retry, and retain previous attempts.
