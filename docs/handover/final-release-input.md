# Final release input

## Reproduce from a clean checkout

Requirements: Node 20+, npm, and the final integration commit replayed on an authenticated clone.

```bash
npm ci
cp .env.example .env.local
npm run check
npm run test:contracts
npm run test:evidence
npm run build
npm run dev
```

Do not overwrite an existing `.env.local`; the `cp` line is for a clean checkout only. Open `http://127.0.0.1:3000`. Use **Guided roles** to present individual stakeholder actions, or choose **Automatic 22-step** for the full regression. Wait for `CONFIRMED` before reading ownership or evidence.

For command-line execution while the app is running:

```bash
npm run test:kat-api
npm run demo:journey
```

## Exact actor sequence

1. Artist (signer 1) uploads and submits Design 1.
2. Verifier (signer 2) records human approval.
3. Publisher (signer 3) approves eligibility.
4. Admin (signer 0) opens Voting Round 1.
5. Fan A (signer 5) votes.
6. Fan B (signer 6) votes.
7. Admin finalizes; Design 1 wins.
8. Publisher records agreement terms: primary artist 8,000 BPS; resale artist 500 BPS.
9. Publisher creates Kat production version v1.
10. Publisher submits production on-chain; Game Developer (signer 4) approves it with `maxSupply = 1`.
11. Publisher creates Auction 1.
12. Buyer A (signer 7) approves and bids 120 MockVND.
13. Buyer B (signer 8) approves and bids 150 MockVND.
14. Buyer A withdraws 120 MockVND refund.
15. Admin settles after the deadline; Buyer B receives token 1.
16. Artist, Publisher Treasury, and Marketplace Treasury withdraw 120, 15, and 15.
17. Confirmed mint receipt activates Buyer B; replay proves idempotency.
18. Buyer B lists token 1 for 200.
19. Buyer C (signer 9) approves and buys.
20. Seller, Artist, Publisher Treasury, and Marketplace Treasury withdraw 180, 10, 6, and 4.
21. Verify Buyer B balance 0, Buyer C balance 1, inactive listing, and blocked repurchase.
22. Confirmed transfer receipt revokes Buyer B, puts Buyer C into `DELIVERY_PENDING`, then retry updates the same record to `ACTIVE`.

The runner then verifies suspend/reinstate and pause/unpause without deleting evidence, accounting, or ownership.

Expected final state: Buyer C owns entitlement 1; Buyer B is `REVOKED`; Buyer C is `ACTIVE`; all 22 steps pass with no manual data edit.
