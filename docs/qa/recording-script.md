# Recording script — MOBA Forge prototype

Target length: 4–6 minutes for the product demonstration segment.

## 1. Value and boundary — 30 seconds

Open the landing screen. Explain that MOBA Forge is a publisher-authorised marketplace for community-created skin concepts. The token represents a limited in-game usage entitlement; it does not transfer copyright or game IP.

Point to the market-ready gate. Explain that the auction contract—not the frontend—requires verification, publisher eligibility, a voting winner, an agreement, technical approval, positive supply and no suspension.

## 2. Stakeholder checkpoint — 60 seconds

Open **Guided roles** and select **Start / reset guided demo**.

Show that Artist Step 1 reaches `CONFIRMED` and produces `DesignSubmitted`. Select Verifier and execute Step 2. Show that the evidence table now contains the verifier address, block, event and transaction hash.

Explain that each checkpoint executes the same real contract/API logic as the full regression, on a fresh deterministic Hardhat chain through that checkpoint.

## 3. Full marketplace journey — 90 seconds

Switch to **Automatic 22-step** and run the clean journey. While it is pending, explain the path: submission → review → voting → agreement → production → primary auction → mint → activation → authorised resale → access transfer.

When confirmed, show:

- Buyer C as final entitlement owner.
- Buyer B game access as `REVOKED`.
- Buyer C game access as `ACTIVE`.
- Primary split `120 / 15 / 15`.
- Resale split `180 / 10 / 6 / 4`.

## 4. Blockchain evidence — 60 seconds

Filter by `primary` or search for `AuctionSettled`. Show block number, actor, final price and transaction hash. Then filter by `entitlement` and show `EntitlementMinted` and `EntitlementTransferred`.

State clearly: transaction events and ownership are on-chain; game activation is an off-chain record linked to confirmed entitlement events.

## 5. Kat operations — 45 seconds

Show upload/hash, pre-screen plus human review, versioned production/QA and account access status. Explain that files, KYC, detailed reports, 3D assets and game-account identifiers remain off-chain for privacy, size and operational reasons; hashes and decisions are anchored on-chain where required.

## 6. Close — 20 seconds

Conclude that the prototype demonstrates enforceable market eligibility, transparent escrow and revenue allocation, controlled entitlement transfer and a complete auditable trail. Disclose that MockVND, Hardhat, KYC and Riot/Garena delivery are prototype integrations rather than production services.

## Presenter checks

- Run `npm run check`, `npm run test:contracts`, `npm run test:evidence` and `npm run build` before recording.
- Keep browser zoom at 100% and close the Next.js development-tools badge if it obstructs content.
- Never call the entitlement an NFT copyright transfer.
- Never call Kat activation on-chain proof.
- Use the automatic journey if time is limited; use two guided checkpoints to prove role-level interaction.
