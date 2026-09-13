# Release report

Status: **FULL INTEGRATION FUNCTIONAL — NONBLOCKING ISSUES LISTED**

## Gate result

| Gate | Result |
|---|---|
| Open Blocker / High defects | PASS — 0 / 0 |
| Contract compilation | PASS — 35 Solidity files in clean run |
| Contract tests | PASS — 58/58 |
| Typecheck and production build | PASS |
| Kat API acceptance | PASS — 25/25 checks (18 documented + 7 additional) |
| Receipt parser acceptance | PASS |
| Full journey | PASS — 22/22, repeated twice in clean worktree |
| Manual data correction | PASS — none |
| Final entitlement owner | PASS — Buyer C, balance 1 |
| Buyer B / Buyer C game access | PASS — REVOKED / ACTIVE |
| Guided role mode | PASS — Artist and Verifier checkpoints produced real receipts and advanced authorised roles |
| Runtime evidence page | PASS — 48 chronological decoded receipt rows, filters and JSON export |
| Browser smoke | PASS — Computer Use verified the redesigned UI, guided checkpoint and 22/22 automatic completion |

## Accounting

- Buyer A bid and refund: 120 / 120 MockVND.
- Winning escrow: 150 MockVND.
- Primary distribution: Artist 120, Publisher 15, Marketplace 15.
- Resale price: 200 MockVND.
- Resale distribution: Seller 180, Artist 10, Publisher 6, Marketplace 4.
- Final listing: inactive; repeat purchase rejected.

The local prototype is presentation-ready and ready for recording. Public-testnet deployment remains optional and requires a dedicated RPC endpoint, test wallet and faucet funds. Before public repository release, replay the commits onto authenticated real history and separately triage dependency audit findings.
