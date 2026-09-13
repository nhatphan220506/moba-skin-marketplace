# Full on-chain product implementation status

## Completed

- A public landing page and marketplace shell now route into Explore, design detail, voting, auctions, resale, evidence, About and Trust.
- Eight role workspaces exist for Artist, Verifier, Publisher, Game Developer, Fan, Buyer, Seller and Administrator.
- Browser-wallet connection, Sepolia switching, connected balance/role reads, chain-specific deployments, wallet-signed writes, receipt states and Etherscan transaction links are implemented.
- Every mandatory contract write in the current seven-contract system has a frontend action form.
- Sepolia deployment, confirmation, role assignment, actor funding, MockVND seeding, smoke testing and Etherscan verification tooling are implemented.
- The event indexer supports confirmations, cursor persistence, unique events, resumable bounded scans and short reorg replay with PostgreSQL or local JSON.
- PostgreSQL, IPFS-compatible object storage and deterministic local fallbacks are implemented behind the existing APIs.
- Public evidence uses indexed Sepolia data when available and never calls local hashes public evidence.
- A dedicated test-only deployer funded from MetaMask deployed all seven contracts to public Sepolia at block `11695984`.
- Public smoke checks confirmed bytecode at every address and the AssetRegistry-to-CommunityVoting configuration.
- MockVND was minted on Sepolia and the indexer persisted 19 unique public events through finalized block `11696063`.

## Verified results

- Contract suite: 58/58 passing.
- Kat API acceptance: 25/25 passing.
- Local full journey: 22/22 passing twice.
- Evidence parser acceptance: passing.
- TypeScript typecheck: passing.
- Next.js production build: passing, 30 routes generated.
- Local route smoke check: 22/22 pages/APIs returned HTTP 200.
- Public Sepolia contract smoke: 7/7 bytecodes and cross-contract link passing.
- Public Sepolia event index: 19 unique events, resumable and idempotent.

## Public deployment

- Deployer: `0x0528f92525E8cBEA406D291961E9175949d5F239`.
- Funding transaction: `0x31291191d3bc91a42fbdc0ac20ab2d88166a51b33ba4b4c62591aa9da4d9f4e6`.
- Deployment addresses and transaction receipts are recorded in `deployments/sepolia.json`.
- MockVND seed transaction: `0xe595df1c4013aeb2be60943371c544a07bb36bb6f9c99f9c41a8015c09ec54a1`.

See `docs/operations/SEPOLIA_DEPLOYMENT_REPORT.md` for explorer links and the completion boundary.

## Pending external inputs

- Etherscan source-code verification awaits an `ETHERSCAN_API_KEY`; public bytecode and transactions are already visible.
- Hosted PostgreSQL and IPFS remain optional and unconfigured; their adapters are complete and tested through local fallbacks.
- Public hosting, domain and monitoring are not configured.
- Distinct actor addresses were not provided, so deployment-time Artist, Verifier, Publisher, Developer, Fan and buyer actors currently resolve to the dedicated deployer. The full multi-wallet 25-step Sepolia journey is therefore not yet claimed.
- The connected MetaMask wallet was used only to fund the deployer. Broad demo role grants and MockVND minting to that wallet were not executed because those privileged writes require separate explicit authorization.

The public on-chain infrastructure is complete and usable. Finishing the remaining external items upgrades it from a working testnet deployment to a shareable hosted multi-user demo.
