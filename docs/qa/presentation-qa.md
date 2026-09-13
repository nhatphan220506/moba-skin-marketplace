# Presentation Q&A — MOBA Forge

## What exactly is recorded on-chain?

The prototype records the decisions and transactions that need shared, tamper-evident proof: design submission and verification, publisher eligibility, voting, commercial-agreement hash, production approval, auction activity, escrow settlement, entitlement minting and transfer, suspension controls, and primary/resale revenue allocation. Each successful action has a confirmed receipt with a transaction hash, block number, actor and decoded event.

## Is everything stored on blockchain?

No, and that is intentional. Large or private operational data stays off-chain: design files, 3D assets, detailed review reports, KYC material, game-account identifiers and the actual game activation operation. Where evidence is required, the system can anchor a hash or decision on-chain and link the off-chain record to a confirmed entitlement event.

## Does the token prove copyright ownership?

No. It represents a limited usage entitlement under publisher-defined terms. Copyright and ownership of game IP remain with their legal owners. The UI states this boundary explicitly so the prototype does not overclaim what the blockchain proves.

## Why use blockchain instead of only a database?

The marketplace has parties with different interests: artist, verifier, publisher, voters, buyers, seller and platform. Smart contracts provide one shared transaction history and enforce market-entry gates, escrow, settlement, transfer rules and royalty allocation without relying on the frontend to honour those rules. Private and high-volume operations still use a conventional backend.

## What prevents an unapproved skin from entering the auction?

The primary-market contract checks all market-ready conditions before an auction can open: human verification, publisher eligibility, voting winner, recorded agreement, technical approval, positive maximum supply and no active suspension. Hiding a button in the UI is not the security control; the contract enforces the gate.

## Why ERC-1155?

ERC-1155 supports both unique and limited-edition entitlements in one contract and allows future expansion to multiple skin designs or supply levels. This prototype uses a supply of one in the demonstrated journey, while retaining the standard's multi-token model.

## Can royalties be bypassed?

The demonstrated authorised resale path performs the transfer and revenue split atomically through the secondary-market contract. A production design would also restrict transferability to approved marketplace operators or otherwise define policy for external transfers. The prototype proves the authorised path and does not claim universal enforcement across unrelated chains or marketplaces.

## How is game access kept consistent after resale?

Blockchain ownership is the authority for the entitlement. Kat validates the confirmed mint/transfer evidence before updating the off-chain access record. After resale, the demonstration shows Buyer B as `REVOKED` and Buyer C as `ACTIVE`. The game-access record is not mislabelled as an on-chain event.

## What evidence can an assessor inspect?

The Evidence section exposes chronological decoded receipts and supports search, contract filtering and JSON export. The final deterministic run contains 48 unique `(transactionHash, logIndex)` event records across 22 workflow steps, plus final ownership, access and accounting assertions.

## Is this running on a public blockchain?

The verified submission baseline runs on a deterministic local Hardhat chain (`31337`) with MockVND, which makes the assessment reproducible and avoids testnet instability. Public-testnet deployment is an optional next phase requiring a dedicated RPC endpoint, a test-only wallet and faucet funds.

## What would be required for production?

A production release would add audited contracts, a public or permissioned network choice, secure key management, monitored indexers, durable databases and object storage, real identity/KYC services, publisher legal agreements, a signed game-server integration, incident controls and privacy/compliance review. The current deliverable is a functional assessment prototype, not a production financial system.

