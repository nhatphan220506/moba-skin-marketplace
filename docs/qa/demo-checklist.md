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
2. In **Guided roles**, choose **Start / reset guided demo** and confirm Artist Step 1 reaches `CONFIRMED` with a `DesignSubmitted` receipt.
3. Select Verifier and run Step 2. Confirm the role advances to Publisher and the evidence count increases.
4. Switch to **Automatic 22-step** and choose **Run clean 22-step journey**.
5. Confirm lifecycle `AWAITING_SIGNATURE → PENDING → CONFIRMED`.
6. Confirm `22/22`, Buyer B `REVOKED`, Buyer C `ACTIVE`, and Buyer C as final owner.
7. Confirm primary accounting `120 / 15 / 15` and resale accounting `180 / 10 / 6 / 4`.
8. Search or filter Blockchain Evidence and download the runtime JSON snapshot.
9. Confirm on-chain authority and off-chain private operations are labelled separately.
10. Optionally use the Kat console to upload/hash a file, run pre-screen/human review, create/review production, and refresh access status.

## Recording guardrails

- Do not call the entitlement copyright or game-IP ownership.
- Do not call Kat game delivery on-chain proof.
- Do not present MockVND, Hardhat hashes, KYC, AI screening, or game delivery as production integrations.
- Guided checkpoints replay a fresh deterministic local chain through the selected step; they are real receipts, but not a persistent public network.
