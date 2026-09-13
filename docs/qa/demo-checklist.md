# Demo checklist

## Before the demo

- [x] Use Node 20 or newer.
- [x] Run `npm ci` from the lockfile.
- [x] Copy `.env.example` to `.env.local` only when `.env.local` does not already exist.
- [x] Run `npm run check`.
- [x] Run `npm run test:contracts` and confirm 58 passing.
- [x] Run `npm run test:evidence`.
- [x] Run `npm run build`.

## Functional demo

1. Run `npm run dev` and open `http://127.0.0.1:3000`.
2. Select a demo role and confirm its mapped local address and network.
3. Choose **Run clean 22-step journey**.
4. Confirm lifecycle `AWAITING_SIGNATURE → PENDING → CONFIRMED`.
5. Confirm `22/22 passed`, Buyer B `REVOKED`, Buyer C `ACTIVE`, and Buyer C as final owner.
6. Confirm primary accounting `120 / 15 / 15` and resale accounting `180 / 10 / 6 / 4`.
7. Confirm the Admin Risk card shows suspend/reinstate and pause/unpause with evidence and ownership preserved.
8. Confirm Blockchain Evidence shows chronological confirmed receipt rows and labels Kat records as off-chain.
9. Optionally use the Kat console to upload/hash a file, run pre-screen/human review, create/review production, and refresh access status.

## Recording guardrails

- Do not call the entitlement copyright or game-IP ownership.
- Do not call Kat game delivery on-chain proof.
- Do not present MockVND, Hardhat hashes, KYC, AI screening, or game delivery as production integrations.
