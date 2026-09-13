# Guided role mode

Guided role mode exposes all 22 required actions as stakeholder-specific checkpoints. Each checkpoint launches the canonical journey runner on a fresh deterministic Hardhat network and stops immediately after the selected step. The returned state therefore contains real contract receipts and real Kat records through that checkpoint.

This model intentionally avoids fake frontend success states while retaining reproducibility. It is not a persistent public-chain session: selecting a later checkpoint replays the prerequisite transactions before executing that role's action.

## API

`POST /api/demo/journey` with no body runs all 22 steps.

`POST /api/demo/journey` with `{ "targetStep": 1 }` through `{ "targetStep": 22 }` writes and returns an `IN_PROGRESS` checkpoint snapshot.

Invalid targets return `INVALID_TARGET_STEP`. Concurrent runs return `JOURNEY_ALREADY_RUNNING`.

## UI behavior

- The active role displays only its relevant actions.
- Only the exact next step is enabled.
- A confirmed checkpoint automatically selects the role responsible for the following step.
- Completed actions display a transaction-hash chip or an explicit off-chain-record label.
- Evidence filters operate only on decoded confirmed events.
- Runtime evidence can be downloaded as JSON.

## Trust boundary

The visible role selector uses known Hardhat development actors. It does not impersonate real users and must never be presented as wallet authentication. Public browser-wallet signing and persistent testnet deployment remain optional extensions.
