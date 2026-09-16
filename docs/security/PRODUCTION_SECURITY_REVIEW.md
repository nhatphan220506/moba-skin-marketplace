# Production security review

## Implemented controls

- Wallet authentication uses a five-minute, single-use EIP-191 challenge. A consumed nonce cannot be replayed.
- API sessions are HMAC-SHA256 signed, expire after 30 minutes and are scoped to the configured chain.
- Server-side role checks read the deployed AccessControl contracts before verifier, publisher, game-team or admin data can be changed.
- Actor fields must match the authenticated wallet, preventing a valid signer from impersonating another wallet.
- CORS is allowlisted to the production GitHub Pages origin. API responses add `nosniff` and a strict referrer policy.
- Private files are stored in a non-public Supabase bucket. The service-role credential stays server-side; source objects are released only after the indexed lifecycle becomes public.
- PostgreSQL collection updates use transaction-scoped advisory locks to prevent concurrent web/indexer writes from overwriting one another.
- Game delivery mutation routes require a separate service credential in production.
- The local deterministic demo runner is disabled in production.
- Confirmed transaction sync re-reads receipts from RPC and decodes only known deployed-contract events.
- Health responses report modes and availability without returning secrets.

## Operational requirements

- Rotate `SESSION_SECRET`, `GAME_SERVICE_SECRET`, database credentials and the Supabase service key if they are ever exposed.
- Keep the Supabase evidence bucket private and disable anonymous insert/update/delete policies.
- Use a monitored Sepolia RPC and alert on indexer lag or repeated RPC failures.
- Deploy one backend instance unless collection storage is migrated from JSON payloads to normalized row-level tables.
- Do not place deployer private keys, Supabase service keys or database URLs in `NEXT_PUBLIC_*` variables.
- Separate production role wallets before a mainnet deployment; the assessment testnet may use a consolidated demo wallet.

## Residual limitations

- This remains a Sepolia assessment prototype. Contract tests pass, but no independent professional smart-contract audit has been performed.
- The mock game adapter proves integration behavior; a real game must authenticate its delivery worker and independently validate entitlement ownership.
- Rate limiting and WAF protection should be enabled at the hosting provider before opening a public mainnet service.
