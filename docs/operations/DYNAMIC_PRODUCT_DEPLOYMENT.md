# Dynamic product deployment

The complete multi-user flow requires the Next.js server and the Sepolia indexer. GitHub Pages remains a static public presentation build and deliberately removes `app/api` during deployment.

## Runtime

Build the included `Dockerfile` and run `npm start`. The start command launches the Next.js service and the resumable Sepolia indexer together.

Required production variables:

- `SEPOLIA_RPC_URL`: private or monitored Sepolia RPC endpoint.
- `DATABASE_URL`: durable PostgreSQL connection string.
- `SESSION_SECRET`: random value of at least 32 characters used for short-lived wallet sessions.
- `GAME_SERVICE_SECRET`: separate random value of at least 32 characters for delivery-service mutations.
- `ALLOWED_ORIGINS=https://nhatphan220506.github.io`.
- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` and `SUPABASE_STORAGE_BUCKET`: private object storage configuration.
- `IPFS_PINNING_URL` and `IPFS_PINNING_TOKEN`: private evidence/object-storage pinning API.
- `NEXT_PUBLIC_DEFAULT_CHAIN_ID=11155111`.
- The static frontend must be rebuilt with `NEXT_PUBLIC_API_BASE_URL` set to the deployed backend origin.
- The seven `NEXT_PUBLIC_SEPOLIA_*_ADDRESS` values may be omitted while `deployments/sepolia.json` is shipped unchanged.

Recommended:

- `ETHERSCAN_API_KEY` for source verification.
- `INDEXER_CONFIRMATIONS=6` and `INDEXER_CHUNK_SIZE=2000`.

## Product behavior

1. A connected Artist wallet uploads evidence and signs ownership of the resulting SHA-256 digest.
2. The private draft is stored in PostgreSQL/object storage.
3. `submitDesign` creates the public design ID.
4. Every confirmed marketplace transaction is independently re-read from RPC by `/api/indexer/transaction` and inserted idempotently.
5. Role queues derive their lifecycle from indexed contract events.
6. A design becomes public only after verification, publisher eligibility, a voting win, an agreement and technical approval.
7. Home and Explore fetch the resulting public projection; no code or Git push is required to publish a qualified asset.

`GET /api/health` reports the active database, storage and indexer mode without exposing credentials.
