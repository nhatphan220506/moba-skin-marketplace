# Kat-owned API routes

Implemented route groups: `files`, `verification`, `production`, `accounts`, and `game`. They use the frozen field names and return errors as `{ code, message, recoverable, details? }`.

Run the application with `npm run dev`. See `docs/api/offchain-api.md` and `docs/api/mock-game-api.md` for complete requests, responses, dependencies, and limitations.

These routes do not redefine blockchain ownership, access-control roles, lifecycle gates, auction logic, BPS, or entitlement/IP meaning.
