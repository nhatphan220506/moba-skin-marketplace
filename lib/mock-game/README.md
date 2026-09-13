# Kat-owned mock game adapter

Purpose: link public demo wallets to private mock game-account references and translate frozen entitlement events into activation, revocation, pending-delivery, retry, and status records.

Use the account and game API routes documented in `docs/api/mock-game-api.md`. `eventSync.ts` is the internal adapter for `EntitlementMinted` and `EntitlementTransferred` receipt-shaped evidence.

The adapter depends on the frozen activation types and local JSON storage. It stores no password, token, private key, or KYC material.

Known limitations: the prototype validates event shape but does not independently query a chain or prove receipt authenticity, delivery is simulated, and storage is designed for one local process rather than concurrent production workers.
