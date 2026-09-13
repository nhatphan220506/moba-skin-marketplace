# Baseline Audit — `feature/van-testing`

Audit date: 2026-09-13 (Asia/Ho_Chi_Minh)  
Scope: Package 1 — Baseline Sync & Interface Freeze Audit  
Auditor role: Repository Baseline Auditor  

## Source precedence used

1. `docs/interfaces.md` at latest `main`, including approved CR-001.
2. Solidity interface skeletons and shared TypeScript/config files at latest `main`.
3. `docs/contract-implementation-spec.md` for approved implementation detail.
4. `docs/masterplan/Masterplan_Final.docx` and `docs/handover/03_Van_Testing_Evidence_25pct_Handover.docx` for business intent.

No missing interface, event, role, state transition, or business rule is inferred in this audit.

## A. Repository status

| Item | Finding |
| --- | --- |
| Assigned branch | `feature/van-testing` |
| Branch comparison | `0` ahead / `3` behind `main` |
| Latest `main` commit observed | `92f166eb4f28fb5907639923d4f260ff3e2c2593` |
| Missing commits | `5fa9c7452dac1b6b6cb7f50571119e1fe9cc7d4d` — contract implementation specification; `0ff04a79e932b8189950628769d9cdf1d8dc75ae` — CR-001 additive interfaces; `92f166eb4f28fb5907639923d4f260ff3e2c2593` — merge PR #1 |
| Required sync | Merge or rebase latest `main` into `feature/van-testing`, verify all three commits are present, then rerun checks before designing tests. No shared-interface edits are required from Văn. |
| Current milestone | `m0-interface-freeze` with approved additive extension CR-001 |
| GitHub check status | GitHub shows successful status checks for both the current `feature/van-testing` head and latest `main`. This proves the configured checks passed, not that contract behavior exists. |
| Compile status | Interface skeletons are documented as compilable and GitHub checks are green. A clean local `npm ci && npm run check` was not independently run in this browser audit because the private repository could not be exported from Chrome or authenticated from the local terminal. Re-run after sync. |
| Implementation status | All seven Solidity files are `abstract contract` M0 interface skeletons with `external virtual` functions and no executable business logic. Tests, demo scripts, and QA outputs contain README placeholders only. |

### Sync gate

Do not begin behavioral test implementation against the current feature head. First bring in CR-001 from `main`, confirm the replacement baseline, and rerun:

```text
npm ci
npm run check:m0
npm run typecheck
npm run compile:contracts
```

## B. Frozen interface inventory

Status legend:

- **Frozen / skeleton only** — name, parameters, event, and error surface exist, but business logic is not implemented.
- **Frozen / implemented utility** — executable shared TypeScript/config behavior exists.
- **Unclear** — sources do not give one testable answer.

| Contract / Module | Function | Actor / Role | Event | State impact | Status |
| --- | --- | --- | --- | --- | --- |
| AssetRegistry | `submitDesign(string,bytes32,bytes32,bytes32) -> designId` | `ARTIST_ROLE` | `DesignSubmitted` | creates monotonic design; `Submitted` | Frozen / skeleton only |
| AssetRegistry | `requestRevision(uint256,bytes32)` | `VERIFIER_ROLE` | `DesignRevisionRequested` | `Submitted -> RevisionRequired` | Frozen / skeleton only |
| AssetRegistry | `verifyDesign(uint256,bytes32)` | `VERIFIER_ROLE` | `DesignVerified` | sets verified; `Submitted -> Verified` | Frozen / skeleton only |
| AssetRegistry | `approveConceptEligibility(uint256,bytes32)` | `PUBLISHER_ROLE` | `ConceptEligibilityUpdated` | eligible or `Ineligible` | Frozen / skeleton only |
| AssetRegistry | `recordAgreement(uint256,bytes32,uint16,uint16)` | `PUBLISHER_ROLE` | `AgreementRecorded` | records agreement and artist BPS | Frozen / skeleton only |
| AssetRegistry | `suspendDesign(uint256,bytes32)` | Admin/risk authority | `DesignSuspended` | operational state enters `Suspended` | Frozen / skeleton only |
| AssetRegistry | `reinstateDesign(uint256)` | Admin/risk authority | `DesignReinstated` | restores allowed prior state | Frozen / skeleton only |
| AssetRegistry | `setCommunityVoting(address)` | Admin | `CommunityVotingUpdated` | configures trusted voting dependency once | Frozen / skeleton only (CR-001) |
| AssetRegistry | `getCommercialTerms(uint256)` | Any caller | read only | artist and artist BPS | Frozen / skeleton only (CR-001) |
| AssetRegistry | `getDesign`, `isVerified`, `isPublisherEligible`, `hasAgreement` | Any caller | read only | authoritative registry views | Frozen / skeleton only |
| CommunityVoting | `openVoting(uint256,uint256[],uint64,uint64)` | Admin | `VotingOpened` | opens eligible candidate round | Frozen / skeleton only |
| CommunityVoting | `vote(uint256,uint256)` | Fan | `VoteRecorded` | increments vote; one wallet/round | Frozen / skeleton only |
| CommunityVoting | `finalizeVoting(uint256) -> winnerDesignId` | Admin/public automation | `VotingFinalized` | finalizes deterministic winner | Frozen / skeleton only |
| CommunityVoting | `hasVoted`, `voteCount`, `isVotingWinner`, `getRound` | Any caller | read only | voting views | Frozen / skeleton only |
| CompatibilityRegistry | `submitProduction(uint256,bytes32,bytes32,string)` | Publisher/production role | `ProductionSubmitted` | production pending QA | Frozen / skeleton only |
| CompatibilityRegistry | `approveCompatibility(uint256,bytes32,uint256)` | `GAME_DEVELOPER_ROLE` | `CompatibilityApproved` | approved; stores `maxSupply` | Frozen / skeleton only |
| CompatibilityRegistry | `requireRework(uint256,bytes32)` | `GAME_DEVELOPER_ROLE` | `ReworkRequired` | QA state `ReworkRequired` | Frozen / skeleton only |
| CompatibilityRegistry | `isTechnicallyApproved`, `getMaxSupply`, `getProduction` | Any caller | read only | technical views | Frozen / skeleton only |
| MockVND | `mint(address,uint256)` | `MINTER_ROLE` | `Transfer` | increases balance and total supply | Frozen / skeleton only |
| MockVND | `approve(address,uint256)` | Token owner | `Approval` | allowance only; not payment | Frozen / skeleton only |
| MockVND | `transfer`, `transferFrom` | Holder / approved spender | `Transfer` | payment balance movement | Frozen / skeleton only |
| MockVND | `name`, `symbol`, `decimals`, `totalSupply`, `balanceOf`, `allowance` | Any caller | read only | ERC-20 views | Frozen / skeleton only |
| SkinEntitlement1155 | `mint(address,uint256,uint256,uint256,string)` | Primary Auction with `MINTER_ROLE` | `EntitlementMinted` | increases owner balance/supply within cap | Frozen / skeleton only |
| SkinEntitlement1155 | `authorisedTransfer(address,address,uint256,uint256,uint256)` | authorised Secondary Marketplace | `EntitlementTransferred` | seller `-1`; buyer `+1` | Frozen / skeleton only |
| SkinEntitlement1155 | `setMarketplaceAuthorization(address,bool)` | Admin | `MarketplaceAuthorizationUpdated` | transfer authority config | Frozen / skeleton only |
| SkinEntitlement1155 | `setTransferable(uint256,bool)` | Admin/authorised role | `TransferabilityUpdated` | token transfer gate | Frozen / skeleton only |
| SkinEntitlement1155 | `pause`, `unpause` | Admin / `PAUSER_ROLE` | no dedicated frozen event in skeleton | blocks/restores mint and transfer | Frozen / skeleton only (CR-001) |
| SkinEntitlement1155 | `balanceOf`, `totalSupply`, `isTransferable` | Any caller | read only | entitlement views | Frozen / skeleton only |
| PrimaryAuction | `createAuction(uint256,uint256,uint256,uint64,uint64)` | Publisher/marketplace | `AuctionCreated` | scheduled/open auction after full gate | Frozen / skeleton only |
| PrimaryAuction | `placeBid(uint256,uint256)` | Buyer; creator rejected | `BidPlaced`, `RefundAvailable` | escrow and highest bid update | Frozen / skeleton only |
| PrimaryAuction | `withdrawRefund(uint256)` | Outbid buyer | `RefundWithdrawn` | clears pending return then pays | Frozen / skeleton only |
| PrimaryAuction | `settle(uint256)` | Authorised/public after deadline | `AuctionSettled`, `ProceedsAvailable`, `EntitlementMinted` | settles once, records proceeds, mints | Frozen / skeleton only |
| PrimaryAuction | `cancelAuction(uint256)` | Admin / authorised Publisher | `AuctionCancelled` | `Cancelled`; bid moves to pending return | Frozen / skeleton only (CR-001) |
| PrimaryAuction | below-reserve close through `settle` | Authorised/public after deadline | `AuctionClosedUnsold` | `Unsold`; no mint/proceeds; refund claim remains | Frozen / skeleton only (CR-001) |
| PrimaryAuction | `withdrawProceeds()` | Recipient | `ProceedsWithdrawn` | clears receivable then pays | Frozen / skeleton only |
| PrimaryAuction | `pendingReturns`, `pendingProceeds`, `getAuction` | Any caller | read only | accounting/auction views | Frozen / skeleton only |
| SecondaryMarketplace | `listForResale(uint256,uint256,uint256)` | Entitlement owner | `ResaleListed` | active listing | Frozen / skeleton only |
| SecondaryMarketplace | `cancelListing(uint256)` | Seller | `ListingCancelled` | listing inactive | Frozen / skeleton only |
| SecondaryMarketplace | `buyResale(uint256)` | New buyer | `ResaleCompleted`, `ResaleProceedsAvailable`, `EntitlementTransferred` | atomic payment split, transfer, close | Frozen / skeleton only |
| SecondaryMarketplace | `withdrawProceeds()` | Recipient | implementation uses receivables | clears receivable then pays | Frozen / skeleton only |
| SecondaryMarketplace | `getListing(uint256)` | Any caller | read only | listing view | Frozen / skeleton only |
| `config/demo.ts` | `assertDemoBps()` | Build/test utility | n/a | rejects non-10,000 BPS totals | Frozen / implemented utility |
| `types/design.ts` | `isMarketReady(MarketEligibility)` | UI/test utility | n/a | derives market-ready boolean | Frozen / implemented utility |
| `types/evidence.ts` | `EvidenceRow`, `TransactionUiState` | Evidence consumers | n/a | shared normalized schema | Frozen / implemented type |

### Frozen contract names

`AssetRegistry`, `CommunityVoting`, `CompatibilityRegistry`, `MockVND`, `SkinEntitlement1155`, `PrimaryAuction`, `SecondaryMarketplace`.

### Frozen roles

Business roles in `config/roles.ts`: `ADMIN`, `ARTIST`, `VERIFIER`, `PUBLISHER`, `GAME_DEVELOPER`, `FAN`, `BUYER_SELLER`, `MARKETPLACE`.

Stable on-chain role identifiers in the implementation specification: `DEFAULT_ADMIN_ROLE`, `ARTIST_ROLE`, `VERIFIER_ROLE`, `PUBLISHER_ROLE`, `GAME_DEVELOPER_ROLE`, `FAN_ROLE`, `MINTER_ROLE`, `MARKETPLACE_ROLE`, `PAUSER_ROLE`.

Deterministic actor mapping: admin `0`, artist `1`, verifier `2`, publisher `3`, gameDeveloper `4`, fanA `5`, fanB `6`, buyerA `7`, buyerB `8`, buyerC `9`, marketplaceTreasury `10`.

### Frozen lifecycle states

Canonical TypeScript states:

```text
DRAFT -> SUBMITTED -> VERIFIED -> VOTING_ELIGIBLE -> VOTING
-> SELECTED -> AGREEMENT_RECORDED -> IN_PRODUCTION
-> TECHNICAL_REVIEW -> MARKET_READY -> AUCTION_OPEN
-> ENTITLEMENT_ISSUED
```

Exceptions: `SUBMITTED -> REVISION_REQUIRED -> SUBMITTED`; `VERIFIED -> INELIGIBLE`; `SELECTED -> CANCELLED`; `TECHNICAL_REVIEW -> REWORK_REQUIRED -> IN_PRODUCTION`; eligible operational states may enter `SUSPENDED` and later be reinstated.

The implementation specification says later UI states are derived from authoritative contracts rather than written through a generic `setStatus` function. See blocker BL-03 about the overlap with the frozen Solidity enum.

### Frozen events

- Asset: `DesignSubmitted`, `DesignRevisionRequested`, `DesignVerified`, `ConceptEligibilityUpdated`, `AgreementRecorded`, `DesignSuspended`, `DesignReinstated`, `CommunityVotingUpdated`.
- Voting: `VotingOpened`, `VoteRecorded`, `VotingFinalized`.
- Compatibility: `ProductionSubmitted`, `CompatibilityApproved`, `ReworkRequired`.
- Payment: `Transfer`, `Approval`.
- Entitlement: `EntitlementMinted`, `EntitlementTransferred`, `MarketplaceAuthorizationUpdated`, `TransferabilityUpdated`.
- Primary auction: `AuctionCreated`, `BidPlaced`, `RefundAvailable`, `RefundWithdrawn`, `AuctionSettled`, `AuctionCancelled`, `AuctionClosedUnsold`, `ProceedsAvailable`, `ProceedsWithdrawn`.
- Secondary market: `ResaleListed`, `ListingCancelled`, `ResaleCompleted`, `ResaleProceedsAvailable`.

### Frozen custom errors

- Shared/asset: `UnauthorizedRole`, `DesignNotFound`, `InvalidStateTransition`, `DesignIsSuspended`, `InvalidBpsTotal`, `InvalidContractAddress`, `DependencyAlreadyConfigured`.
- Voting: `VotingNotOpen`, `VotingStillOpen`, `AlreadyVoted`, `IneligibleCandidate`, `AlreadyFinalised`.
- Compatibility: `MissingAgreement`, `InvalidMaxSupply`, `ProductionNotFound`.
- MockVND: `UnauthorizedMinter`, `InsufficientBalance`, `InsufficientAllowance`.
- Entitlement: `UnauthorizedMinter`, `UnauthorizedMarketplace`, `DirectTransferDisabled`, `SupplyCapExceeded`, `EntitlementPaused`.
- Primary: `NotMarketReady`, `AuctionNotActive`, `AuctionStillOpen`, `BidBelowMinimum`, `CreatorCannotBid`, `ReserveNotMet`, `AlreadySettled`, `NothingToWithdraw`.
- Secondary: `NotEntitlementOwner`, `EntitlementNotTransferable`, `InvalidPrice`, `ListingNotActive`, `SellerNoLongerOwner`, `AlreadyPurchased`.

Note: `AlreadyFinalised`, `CreatorCannotBid`, `SupplyCapExceeded`, `InvalidPrice`, and `AlreadyPurchased` exist in Solidity skeletons but are omitted from the shorter canonical-error list in `docs/interfaces.md`. Tests should follow the Solidity names after branch sync, while the documentation owner confirms the inventory.

## C. Frozen demo constants

| Constant | Frozen value | Confirmation source |
| --- | ---: | --- |
| `designId` | `1` | `config/demo.ts`, interfaces, handover, specification |
| `auctionId` | `1` | `config/demo.ts`, interfaces/handover |
| `tokenId` | `1` (`tokenId = designId`) | `config/demo.ts`, specification |
| `maxSupply` | `1` | `config/demo.ts`, masterplan, handover |
| Voting round / resale listing | `1` / `1` | `config/demo.ts` |
| Auction reserve | `100 MockVND` | all business sources |
| Minimum increment | `10 MockVND` | `config/demo.ts` |
| Buyer A bid | `120 MockVND` | all business sources |
| Buyer B bid | `150 MockVND` | all business sources |
| Resale price | `200 MockVND` | all business sources |
| Primary split | Artist `80%` / Publisher `10%` / Marketplace `10%` (`8000/1000/1000` BPS) | config/interfaces/spec |
| Primary expected amounts | Artist `120`, Publisher `15`, Marketplace `15` | config/interfaces/handover |
| Resale split | Seller `90%` / Artist `5%` / Publisher `3%` / Marketplace `2%` (`9000/500/300/200` BPS) | config/interfaces/spec |
| Resale expected amounts | Seller `180`, Artist `10`, Publisher `6`, Marketplace `4` | config/interfaces/handover |
| MockVND decimals | `18` | `config/demo.ts`, implementation specification |
| BPS denominator | `10,000` | `config/demo.ts`, implementation specification |

## D. Market-ready conditions

All seven conditions are consistently stated and must be individually tested:

- [x] `verified == true`
- [x] `publisherEligible == true`
- [x] `votingWinner == true`
- [x] `agreementRecorded == true`
- [x] `technicallyApproved == true`
- [x] `maxSupply > 0`
- [x] `suspended == false`

Authoritative ownership is split across `AssetRegistry`, `CommunityVoting`, and `CompatibilityRegistry`. The frontend/API may display the derived gate but must not supply authoritative eligibility booleans to `PrimaryAuction.createAuction`.

## E. Open questions / blockers

| ID | Question | Source conflict / missing item | Owner | Must resolve before |
| --- | --- | --- | --- | --- |
| BL-01 | Which synced commit is the required test baseline? | `feature/van-testing` is 3 commits behind and lacks approved CR-001. | Nhật / repository owner | Any test matrix or fixture tied to signatures |
| BL-02 | How must PrimaryAuction read suspension? | The implementation specification explicitly calls `AssetRegistry.isSuspended(designId)`, but the frozen AssetRegistry skeleton exposes no such getter. `getDesign(designId).suspended` could work, but choosing it would be an undocumented implementation assumption. | Nhật | PrimaryAuction implementation/tests |
| BL-03 | Which lifecycle states may AssetRegistry actually write? | The Solidity `DesignStatus` enum includes later derived states (`Selected`, `InProduction`, `TechnicalReview`, `MarketReady`, `AuctionOpen`, `EntitlementIssued`), while the implementation specification says these are derived and AssetRegistry stores registry-owned states only. | Nhật | State-transition assertions |
| BL-04 | Is an initial below-reserve bid accepted? | `docs/interfaces.md` says a below-reserve bid may exist and reserve is a settlement threshold. The implementation specification also says validate a new bid “against reserve or minimum increment,” which is ambiguous for the first bid. | Nhật | PrimaryAuction negative tests |
| BL-05 | Which exact agreement signature is authoritative in narrative docs? | Masterplan uses conceptual `recordAgreement(designId, agreementHash, revenueTerms)`; frozen Solidity uses four parameters with two `uint16` artist BPS fields. | Nhật | Agreement fixtures; use frozen Solidity unless changed |
| BL-06 | Should the canonical error list be expanded? | Several Solidity errors are absent from `docs/interfaces.md` section 9, including `AlreadyFinalised`, `CreatorCannotBid`, `SupplyCapExceeded`, `InvalidPrice`, and `AlreadyPurchased`. | Nhật | Exact revert-name assertions |
| BL-07 | Which event proves pause/unpause? | CR-001 adds callable `pause()` / `unpause()`, but the entitlement skeleton has no dedicated pause/unpause event, while the handover expects evidence for emergency behavior. OpenZeppelin `Paused`/`Unpaused` may be intended but are not frozen here. | Nhật | Emergency evidence tests |
| BL-08 | Is marketplace settlement public or role-gated? | Interfaces say `settle` is authorised/public after deadline; the role matrix says Marketplace may operate explicitly assigned settlement actions. Exact caller policy is not frozen. | Nhật | Access-control test for `settle` |
| BL-09 | What is the exact actor for `openVoting` and `finalizeVoting` automation? | Interfaces permit Admin/public automation for finalize, but there is no automation address/role in `config/roles.ts`. | Nhật | Voting role tests |
| BL-10 | Is `marketplaceTreasury` also the marketplace operator? | `config/roles.ts` assigns signer 10 the `MARKETPLACE` role and names it `marketplaceTreasury`; specification separates marketplace operational authority from treasury dependencies. | Nhật | Role fixtures/deployment |
| BL-11 | What is the independent clean compile result after sync? | GitHub checks are green, but the branch is stale and this audit could not run a clean install/compile locally. | Văn after sync | Package 1 final sign-off |
| BL-12 | Evidence schema documentation needs which shape? | Handover shows generic string `transactionHash`/`actor` and omits `auctionId`, `stateBefore`, `stateAfter`; `types/evidence.ts` uses ``0x${string}`` address/hash types and adds those fields. | Nhật / Văn | Evidence parser tests |

## Frozen but not yet implemented

- All seven Solidity contract modules and every behavioral rule in the inventory.
- Deterministic fixtures and contract tests under `test/`.
- Demo automation under `scripts/demo/`.
- Receipt parsing, normalization, history assembly, and evidence UI.
- Defect log, limitations, demo checklist, and release evidence.

## Frozen and implemented

- Demo constants and BPS self-check in `config/demo.ts`.
- Business roles and deterministic signer indexes in `config/roles.ts`.
- Canonical TypeScript lifecycle and market-ready helper in `types/design.ts`.
- `EvidenceRow` and transaction UI state types in `types/evidence.ts`.
- CR-001 additions are present on `main` in docs and abstract interfaces.

## Package 1 exit assessment

**Not ready for Package 2 yet.** The authoritative baseline is identifiable, but `feature/van-testing` must first sync the three missing commits and produce a clean local check/compile result. BL-02 through BL-10 must be answered or explicitly accepted as documented test constraints before exact behavior/revert assertions are written. No shared contract or interface was changed during this audit.
