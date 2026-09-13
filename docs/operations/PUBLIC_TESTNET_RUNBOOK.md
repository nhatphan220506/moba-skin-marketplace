# Public testnet runbook

## Safety boundary

Use only a dedicated test wallet. Sepolia and MockVND have no monetary value. Never commit `.env`, reveal a private key, reuse a mainnet wallet, or place personal/game-account data in a transaction.

## Implemented commands

```bash
npm run sepolia:validate
npm run sepolia:deploy
npm run sepolia:fund-actors
npm run sepolia:seed-token
npm run sepolia:smoke
npm run sepolia:verify
npm run indexer:sepolia
```

The deployment command refuses the wrong chain, an empty wallet and an accidental overwrite. It deploys all seven contracts in dependency order, waits for confirmations, configures cross-contract permissions, grants operational roles and atomically writes the public artifact to `deployments/sepolia.json`.

## Required inputs

1. Copy `.env.example` to the ignored `.env` file.
2. Set `SEPOLIA_RPC_URL` and a test-only `SEPOLIA_DEPLOYER_PRIVATE_KEY`.
3. Fund the deployer with faucet Sepolia ETH.
4. Set distinct public actor addresses before the role and seed flow.
5. Optionally set `ETHERSCAN_API_KEY`, `DATABASE_URL`, `IPFS_PINNING_URL` and `IPFS_PINNING_TOKEN`.

No hosted service is mandatory for local verification. PostgreSQL and IPFS activate only when configured; otherwise the same application APIs use deterministic JSON and local object storage.

## Deployment sequence

1. `npm run sepolia:validate`
2. `npm run sepolia:deploy`
3. Restart/rebuild the frontend so it loads `deployments/sepolia.json`.
4. `npm run sepolia:fund-actors`
5. `npm run sepolia:seed-token`
6. `npm run sepolia:smoke`
7. `npm run indexer:sepolia`
8. If an explorer key is configured, `npm run sepolia:verify`.

## Evidence and recovery

- Deployment addresses, constructor arguments and transaction hashes are public in `deployments/sepolia.json`.
- The indexer starts at the deployment block, indexes only known contracts, uses `(chainId, transactionHash, logIndex)` as its key, waits for a confirmation depth and replays a short reorg window.
- `/api/indexer/status` reports its cursor and storage mode.
- `/api/evidence` and `/evidence` prefer indexed Sepolia events, falling back truthfully to the executed local snapshot.
- Re-running the indexer is idempotent.

## Production service adapters

- `DATABASE_URL`: all existing Kat collections move to PostgreSQL without changing route handlers. Apply `db/schema.sql` for the complete relational/indexer schema.
- `IPFS_PINNING_URL` + `IPFS_PINNING_TOKEN`: uploads use an IPFS-compatible multipart pinning endpoint and record `ipfs://CID`; without both variables, files stay in ignored local storage.
- `ETHERSCAN_API_KEY`: verifies source and constructor arguments for all seven contracts. This proves bytecode/source correspondence, not security.

