# MOBA Skin Marketplace Prototype

M0 Foundation Package for an authorised, community-contributed MOBA skin marketplace. The prototype records verifiable approvals, auction settlement, limited usage entitlements and authorised resale royalties. It does **not** claim that an artist or buyer owns Riot/Garena game IP.

## Current milestone

`m0-interface-freeze`

M0 contains the shared architecture, data types, contract signatures, event names, API expectations and folder ownership needed for three contributors to work independently. Full contract logic, off-chain service implementation, tests and final UI/UX belong to later phases.

## Stack

- Next.js and TypeScript for the prototype application.
- Solidity and Hardhat local network for blockchain logic.
- OpenZeppelin contracts for later implementations.
- Viem/Wagmi for later wallet and contract integration.
- MockVND ERC-20-compatible token; no real VND or payment gateway.
- Local/mock off-chain storage and mock game backend.

## Install and verify

Requirements: Node.js 20 or newer and npm.

```bash
npm install
cp .env.example .env.local
npm run check:m0
npm run typecheck
npm run compile:contracts
npm run dev
```

Open `http://localhost:3000` after `npm run dev`.

For the later local-chain phase:

```bash
npm run chain
```

Never reuse a Hardhat local private key on a public network or real wallet.

## Full journey target

```text
Submit -> Verify -> Publisher Approve -> Vote -> Record Agreement
-> Approve Production -> Market Ready -> Auction -> Escrow
-> Refund -> Settlement -> Mint -> Activate -> Resale
-> Royalty Split -> Transfer Entitlement -> Transfer Game Access
```

## Role ownership

| Contributor | Weight | Owns |
|---|---:|---|
| Nhật | 50% | Shared interfaces, contracts, blockchain client, system integration and final UI/UX |
| Kat | 25% | Off-chain APIs, hashing, verification records, production records and mock game backend |
| Văn | 25% | Tests, deploy/seed/full-journey scripts, event evidence and release QA |

Read [`docs/ownership.md`](docs/ownership.md) before editing. Shared files under `types/`, `config/`, contract signatures and event names may only be changed through a documented change request reviewed by Nhật.

## Start here

1. Read `docs/masterplan/Masterplan_Final.docx`.
2. Read the personal handover document in `docs/handover/`.
3. Read `docs/interfaces.md`.
4. Checkout the assigned role branch.
5. Run the M0 checks.
6. Work only inside the assigned folders.
7. Submit changes through a pull request using the provided template.

For repository publication and member invitations, follow
[`docs/github-publish-and-handoff.md`](docs/github-publish-and-handoff.md).

## Important scope boundaries

- Build: submission records, verification decision, publisher eligibility, voting, agreement hash, production approval, market gate, MockVND auction, escrow/refund/settlement, ERC-1155 entitlement, authorised resale/royalty and mock game activation.
- Mock only: AI similarity/IP screening, KYC, file storage, 3D production record and Riot/Garena game delivery.
- Do not build: real VND payments, mainnet deployment, real Riot/Garena API, a real AI copyright classifier, Blender/Unity asset production or a legal dispute engine.
