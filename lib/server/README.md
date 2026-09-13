# Kat-owned off-chain services

Purpose: local JSON storage, safe mock file handling, SHA-256 hashing, deterministic verification screening, and versioned production records.

Run through the Next.js API routes with `npm run dev`, or import the service functions directly for tests. Inputs and outputs are documented in `docs/api/offchain-api.md`.

Dependencies are Node.js file/crypto APIs, the frozen shared TypeScript types, and Next.js route handlers. Detailed files and reports remain off-chain; contracts remain authoritative for ownership and lifecycle state.

Known limitations: JSON updates are intended for a single local demo process, uploaded files are local-only, MIME checks are allowlist checks rather than malware scanning, and verification scores are deterministic mock risk signals rather than legal or ownership findings.
