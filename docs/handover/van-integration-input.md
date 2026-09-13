# Văn integration input: Kat off-chain boundary

## Start point

- Verified integration code/evidence commit: `84741d06554eab19a914cbaea4199b218704bdf0`
- Local branch: `integration/kat-offchain`
- Source repository: `https://github.com/nhatphan220506/moba-skin-marketplace.git`
- This commit is in a verified synthetic local history because terminal GitHub credentials were unavailable. Use it locally for QA; before a PR, cherry-pick its changes onto an authenticated real clone based on remote `main` `4b9d550bcc9789c96e96bb3a31fb87e7985fcaad`.

## Contract and ABI input

Current compiled contracts use Solidity `0.8.24` and OpenZeppelin Contracts pinned to `5.4.0`.

Primary ABI artifacts after `npm run compile:contracts`:

- `artifacts/contracts/AssetRegistry.sol/AssetRegistry.json`
- `artifacts/contracts/CommunityVoting.sol/CommunityVoting.json`
- `artifacts/contracts/CompatibilityRegistry.sol/CompatibilityRegistry.json`
- `artifacts/contracts/MockVND.sol/MockVND.json`
- `artifacts/contracts/SkinEntitlement1155.sol/SkinEntitlement1155.json`
- `artifacts/contracts/PrimaryAuction.sol/PrimaryAuction.json`
- `artifacts/contracts/SecondaryMarketplace.sol/SecondaryMarketplace.json`

No deployment-address artifact exists yet. The intended path in the contract specification is `deployments/localhost.json`; public address placeholders are in `.env.example`. Do not invent addresses or overwrite an existing `.env.local`.

## Event adapter boundary

Use `lib/blockchain/katEventAdapter.ts`. Văn owns receipt parsing and validation; this adapter owns only the call boundary and access-delivery order.

`EntitlementMinted` contract fields map as follows:

| Receipt/input | Kat evidence |
|---|---|
| receipt transaction hash | `transactionHash` |
| literal event name | `eventName: "EntitlementMinted"` |
| `designId` | `designId` |
| `tokenId` | `tokenId` |
| `amount` | `amount` (must equal `1`) |
| `owner` | `owner` |

`EntitlementTransferred` maps receipt transaction hash plus `designId`, `tokenId`, `amount`, `previousOwner`, and `newOwner`, with literal event name `EntitlementTransferred`.

Expected adapter result:

```text
EntitlementMinted
→ POST /api/game/activate
→ Buyer B ACTIVE

EntitlementTransferred
→ POST /api/game/revoke
→ Buyer B REVOKED
→ POST /api/game/activate
→ Buyer C DELIVERY_PENDING
→ POST /api/game/retry with the same activationId
→ Buyer C ACTIVE
```

Never roll back or fabricate blockchain ownership when game delivery is pending. The API activation key is transaction hash + action + design ID + token ID, so replay returns the same record.

## Kat API

- Base URL: `http://localhost:3000`
- General documentation: `docs/api/offchain-api.md`
- Mock-game documentation: `docs/api/mock-game-api.md`
- Frozen contract: `docs/api/offchain-api-contract.md`
- Postman collection: `docs/api/postman_collection.json`
- Automated runner: `scripts/integration/run-kat-api-acceptance.mjs`
- Results: `docs/integration/evidence/kat-api-results.json`
- Run log: `docs/integration/evidence/kat-api-run.log`

Standard API error shape: `{ code, message, recoverable, details? }`.

## Deterministic actors and IDs

These are public Hardhat development accounts only:

| Actor | Signer | Wallet/account |
|---|---:|---|
| Artist | 1 | `0x70997970C51812dc3A010C7d01b50e0d17dc79C8` |
| Verifier | 2 | `0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC` |
| Game developer/reviewer | 4 | `0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65` |
| Buyer B | 8 | `0x23618e81E3f5cdF7f54C3d65f7FBc0aBf5B21E8f` / `moba-player-b` |
| Buyer C | 9 | `0xa0Ee7A142d267C1f36714E4a8F75612F20a79720` / `moba-player-c-pending-once` |

- `designId = 1`
- `tokenId = 1`
- `amount = 1`

## Commands

Install and verify:

```bash
npm ci
npm run check
npm run test:contracts
npm run build
```

Start local chain in terminal 1:

```bash
npm run chain
```

Start the Next application and Kat API in terminal 2 (the API routes are part of the same app):

```bash
npm run dev
```

Reset to deterministic seeds and execute the complete Kat flow from terminal 3:

```bash
node scripts/integration/run-kat-api-acceptance.mjs
```

The runner calls `resetAllCollections()` before and after the test and produces both evidence files. There is deliberately no public reset API.

## What Văn must test or add

1. Deploy the seven-contract local journey and save addresses at the approved location.
2. Parse real local receipts for `EntitlementMinted` and `EntitlementTransferred` using the current ABI artifacts.
3. Pass normalized receipt evidence into `syncKatEntitlementEvent()` and retain transaction/block/log evidence in Văn's own evidence model.
4. Re-run `npm run check`, `npm run test:contracts`, `npm run build`, and the Kat API runner.
5. Verify real-receipt sequence: Buyer B `ACTIVE`; resale makes Buyer B `REVOKED`; Buyer C becomes `DELIVERY_PENDING`; retry changes the same activation ID to `ACTIVE`.
6. Verify duplicate receipt delivery is idempotent and invalid/unconfirmed receipts never reach the adapter.
7. Add final automated UI/evidence tests required by the QA plan.

Known limitations: transaction hashes in the existing Kat evidence are deterministic fixtures, not chain proof; JSON storage is single-process and local; no real game publisher, KYC, authentication, asset scanner, or IP determination exists. The off-chain service is never authoritative for ownership, settlement, lifecycle gates, BPS, copyright, or game IP.
