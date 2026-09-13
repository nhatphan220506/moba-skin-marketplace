# Frontend product integration report

## Product experience

The frontend is now a connected multi-sided marketplace rather than a collection of technical contract forms.

- The landing page introduces the value proposition, current season, featured asset, public proof and full concept-to-game journey.
- Discovery includes six visually distinct season assets with live search and lifecycle filtering.
- Every preview is explicitly labelled; only Verdant Sentinel is represented as the executed demonstration asset.
- Asset detail pages adapt their status, creator, category, call to action, lifecycle and disclosure to the selected item.
- Primary auctions, authorised resale, voting and public evidence remain directly accessible from the global product navigation.
- The layout is responsive down to a 390px mobile viewport.

## Participant workspaces

| Participant | User outcome | Backend / chain connection |
| --- | --- | --- |
| Player / Buyer | Discover, bid, buy, view inventory and connect a game account | Account-link and delivery-status APIs plus MockVND/auction/resale contract actions |
| Artist | Upload evidence, hash files, submit a design and withdraw revenue | Object-storage API plus AssetRegistry and marketplace receipts |
| Verifier | Pre-screen evidence and record a human decision | Verification APIs plus report-hash anchoring |
| Publisher | Approve eligibility, agreements, production and auctions | AssetRegistry, CompatibilityRegistry and PrimaryAuction |
| Game team | Create versioned production packages and perform QA | Production APIs plus compatibility approval/rework actions |
| Community | Inspect candidates and sign a vote | CommunityVoting |
| Seller | List, cancel and withdraw authorised resale proceeds | SecondaryMarketplace |
| Administrator | Observe service health and operate governance/risk controls | Indexer/evidence APIs plus admin contract actions |

## Verified integration

- Next.js production build: 30 routes generated successfully.
- TypeScript: passing.
- Kat backend acceptance: 25/25 HTTP checks passing, including files, verification, production, accounts, activation, retry and revoke.
- Smart-contract regression: 58/58 tests passing.
- Public Sepolia contracts remain configured through `deployments/sepolia.json`.
- Wallet actions provide signature, confirmation, failure and Etherscan receipt states.

## Honest boundary

The frontend is ready as a local working product and is connected to the implemented backend and public Sepolia contract configuration. Hosted PostgreSQL/IPFS and public web hosting still require service credentials. Full live multi-user operation also requires distinct role wallets or explicitly approved role grants; no interface label claims that preview catalog content is already deployed on-chain.
