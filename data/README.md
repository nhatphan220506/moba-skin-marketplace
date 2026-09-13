# Kat-owned deterministic mock data

The top-level JSON files are mutable local-demo state. `seeds/` contains immutable reset copies used by `resetAllCollections()` in `lib/server/storage.ts`.

Seed wallets are public Hardhat test addresses derived from the frozen signer indexes. No private keys, passwords, authentication tokens, identity documents, or proprietary game assets are stored here.

`files.json` is an internal metadata index for mock uploads; binary files are written to the ignored `uploads/` directory.
