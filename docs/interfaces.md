# Frozen interface contract — M0

Status: frozen at `m0-interface-freeze` with approved additive extension CR-001
Owner: Nhật  
Consumers: Kat, Văn and final frontend integration

This document defines how the three independently owned modules communicate. A name change is a breaking change even when the underlying logic is unchanged.

## 1. Canonical identifiers

| Name | Type | Meaning |
|---|---|---|
| `designId` | unsigned integer | Marketplace concept identifier |
| `votingRoundId` | unsigned integer | Community voting round |
| `auctionId` | unsigned integer | Primary auction identifier |
| `tokenId` | unsigned integer | ERC-1155 usage-entitlement identifier |
| `resaleListingId` | unsigned integer | Authorised secondary listing |
| `walletAddress` | `0x` address | On-chain actor identity |
| `gameAccountId` | private string | Off-chain game account reference |
| `transactionHash` | `0x` hash | On-chain transaction evidence |
| `reportHash` | `bytes32` | Hash of a detailed off-chain verification report |
| `agreementHash` | `bytes32` | Hash of the signed commercialisation agreement |

Use camelCase in TypeScript and API JSON. Solidity event names use PascalCase. Do not use competing aliases such as `designID`, `assetId` or `skinId` for `designId`.

## 2. Rights model

- Artist contribution: original concept elements, attribution and contractual economic rights.
- Publisher: pre-existing game/character IP, final production control and compatibility approval.
- Buyer: limited usage entitlement under publisher terms.
- Token: evidence of the entitlement and authorised transfer state.
- Token is not: copyright, game IP ownership, unrestricted commercial rights or universal interoperability.

## 3. Lifecycle

Canonical TypeScript states are in `types/design.ts`. Mandatory forward path:

```text
DRAFT -> SUBMITTED -> VERIFIED -> VOTING_ELIGIBLE -> VOTING
-> SELECTED -> AGREEMENT_RECORDED -> IN_PRODUCTION
-> TECHNICAL_REVIEW -> MARKET_READY -> AUCTION_OPEN
-> ENTITLEMENT_ISSUED
```

Exception paths:

- Verification issue: `SUBMITTED -> REVISION_REQUIRED -> SUBMITTED`.
- Publisher rejection: `VERIFIED -> INELIGIBLE`.
- Agreement rejected: `SELECTED -> CANCELLED`.
- Technical issue: `TECHNICAL_REVIEW -> REWORK_REQUIRED -> IN_PRODUCTION`.
- Risk response: eligible operational states may enter `SUSPENDED`; authorised review may reinstate.
- Game delivery failure is off-chain and does not roll back an on-chain ownership transfer.

## 4. Market-ready gate

```text
verified == true
publisherEligible == true
votingWinner == true
agreementRecorded == true
technicallyApproved == true
maxSupply > 0
suspended == false
= MARKET_READY
```

`PrimaryAuction.createAuction` must verify this gate through the registries. The frontend and Kat API may display gate state but are not authoritative.

## 5. Contract interfaces

The Solidity source files are abstract, compilable M0 skeletons. Nhật owns implementation without changing the frozen public surface unless a change request is approved.

### 5.1 AssetRegistry

| Function | Caller | Main input | Required condition | Event/output |
|---|---|---|---|---|
| `submitDesign` | approved Artist | URI and three hashes | caller authorised | `DesignSubmitted`, `designId` |
| `requestRevision` | Verifier | designId, reasonHash | state submitted | `DesignRevisionRequested` |
| `verifyDesign` | Verifier | designId, reportHash | submitted, not suspended | `DesignVerified` |
| `approveConceptEligibility` | Publisher | designId, reviewHash | verified | `ConceptEligibilityUpdated` |
| `recordAgreement` | authorised Publisher | designId, agreementHash, artist BPS | selected winner | `AgreementRecorded` |
| `suspendDesign` | Admin/authorised risk role | designId, reasonHash | design exists | `DesignSuspended` |
| `reinstateDesign` | Admin/authorised risk role | designId | investigation resolved | `DesignReinstated` |
| `setCommunityVoting` | Admin | voting contract address | non-zero; not previously configured | `CommunityVotingUpdated` |
| `getCommercialTerms` | Any caller | designId | design and agreement exist | artist and artist BPS |

`recordAgreement` must confirm that the configured CommunityVoting contract reports the design as a final voting winner.

### 5.2 CommunityVoting

| Function | Caller | Required condition | Evidence |
|---|---|---|---|
| `openVoting` | Admin | candidates verified, publisher eligible and not suspended | `VotingOpened` |
| `vote` | Fan | active period, eligible candidate, wallet has not voted | `VoteRecorded` |
| `finalizeVoting` | Admin/public automation | deadline passed, not finalised | `VotingFinalized` |

### 5.3 CompatibilityRegistry

| Function | Caller | Required condition | Evidence |
|---|---|---|---|
| `submitProduction` | Publisher/production role | agreement recorded | `ProductionSubmitted` |
| `approveCompatibility` | Game Developer | winner, agreement, maxSupply > 0, not suspended | `CompatibilityApproved` |
| `requireRework` | Game Developer | production exists | `ReworkRequired` |

### 5.4 MockVND

Test-only ERC-20-compatible token. `approve` grants spending permission; it is not payment. Auction/resale payment begins when the authorised contract executes `transferFrom`.

### 5.5 SkinEntitlement1155

- Mint only after valid primary settlement and only by an authorised auction contract.
- Total supply may not exceed the compatibility registry supply cap.
- Direct wallet transfer is disabled to prevent resale royalty bypass.
- Transfer is allowed through the authorised secondary marketplace.
- `pause` and `unpause` require Admin or `PAUSER_ROLE`.
- Pausing blocks minting and entitlement transfer.
- Pausing does not delete balances, supply or ownership history.

### 5.6 PrimaryAuction

| Function | Caller | State/accounting rule |
|---|---|---|
| `createAuction` | Publisher/marketplace | contract verifies market-ready gate |
| `placeBid` | Buyer | MockVND moves buyer -> auction escrow |
| `withdrawRefund` | outbid Buyer | pull-payment from `pendingReturns` |
| `settle` | authorised/public after deadline | single settlement, record receivables, mint entitlement |
| `cancelAuction` | Admin or authorised Publisher | stop the auction; move an active highest bid to `pendingReturns`; do not refund automatically |
| `withdrawProceeds` | recipient | pull artist/publisher/marketplace proceeds |

When an auction ends without meeting reserve:

- Status becomes `UNSOLD`.
- No entitlement is minted.
- No recipient proceeds are created.
- Any active highest bid is moved to `pendingReturns`.
- `AuctionClosedUnsold` is emitted.

Reserve is a settlement threshold for the prototype. A below-reserve bid may exist, but it cannot win or produce settlement proceeds.

Primary example at winning bid 150:

| Recipient | BPS | Expected MockVND |
|---|---:|---:|
| Artist | 8,000 | 120 |
| Publisher | 1,000 | 15 |
| Marketplace | 1,000 | 15 |

### 5.7 SecondaryMarketplace

| Function | Caller | State/accounting rule |
|---|---|---|
| `listForResale` | token owner | seller owns one transferable entitlement |
| `cancelListing` | seller | active listing only |
| `buyResale` | new Buyer | collect payment, split receivables and transfer atomically |
| `withdrawProceeds` | recipient | pull proceeds if implementation uses receivables |

Resale example at price 200:

| Recipient | BPS | Expected MockVND |
|---|---:|---:|
| Seller | 9,000 | 180 |
| Artist | 500 | 10 |
| Publisher | 300 | 6 |
| Marketplace | 200 | 4 |

## 6. Frozen event-to-evidence mapping

| Event | Minimum normalized evidence fields | Main consumer |
|---|---|---|
| `DesignSubmitted` | txHash, block, artist, designId, hashes | Submission/Evidence UI |
| `DesignVerified` | txHash, verifier, designId, reportHash | Verification/Evidence UI |
| `ConceptEligibilityUpdated` | publisher, designId, eligible, reviewHash | Publisher review |
| `VotingOpened` | roundId, start/end and candidates | Voting UI/tests |
| `VoteRecorded` | roundId, designId, voter | Voting UI/tests |
| `VotingFinalized` | roundId, winnerDesignId, winningVotes | Lifecycle evidence |
| `AgreementRecorded` | designId, agreementHash and artist BPS | Commercial gate |
| `ProductionSubmitted` | designId, production/compatibility hashes, version | Production UI |
| `CompatibilityApproved` | designId, developer, gameHash, maxSupply | Market-ready gate |
| `AuctionCreated` | auctionId, designId, price and time window | Auction UI |
| `BidPlaced` | auctionId, bidder, amount | Auction history |
| `RefundAvailable` | auctionId, bidder, amount | Escrow/refund evidence |
| `AuctionSettled` | auctionId, designId, winner, finalPrice | Settlement evidence |
| `EntitlementMinted` | designId, tokenId, owner, amount | Inventory/game adapter |
| `ResaleListed` | listingId, designId, tokenId, seller, price | Secondary market |
| `ResaleCompleted` | listingId, tokenId, seller, buyer, price, artistRoyalty | Resale evidence |
| `EntitlementTransferred` | designId, tokenId, old owner, new owner | Inventory/game adapter |
| `DesignSuspended` | designId, reasonHash | Admin risk UI |
| `CommunityVotingUpdated` | txHash, previousVoting, newVoting, actor | Admin/Deployment evidence |
| `AuctionCancelled` | txHash, auctionId, designId, cancelledBy | Auction/Evidence UI |
| `AuctionClosedUnsold` | txHash, auctionId, designId, highestBidder, highestBid | Auction/Evidence UI |

Văn normalizes receipt data into `EvidenceRow` from `types/evidence.ts`. Nhật styles and integrates the functional evidence component later.

## 7. Off-chain API contract for Kat

Detailed examples belong in `docs/api/offchain-api-contract.md`. Frozen route families:

| Endpoint | Purpose | Key output |
|---|---|---|
| `POST /api/files/upload` | Store a mock file and hash its bytes | fileId, storageURI, sha256 |
| `POST /api/files/hash` | Deterministic hash without storage | sha256 |
| `GET /api/files/:id` | Retrieve stored metadata/file | file record or 404 |
| `POST /api/verification/pre-screen` | Deterministic risk summary | scores, flags, recommendedAction |
| `POST /api/verification/reports` | Store human decision | reportId, decision, reportHash |
| `GET /api/verification/reports/:designId` | Load complete report | `VerificationReport` |
| `POST /api/production/records` | Create/version production record | productionHash, compatibilityHash |
| `POST /api/production/review` | Store QA decision | APPROVED/REWORK_REQUIRED/REJECTED |
| `GET /api/production/:designId` | Load current record/history | production records |
| `POST /api/accounts/link` | Map wallet to private game account | `AccountLink` |
| `GET /api/accounts/:wallet` | Resolve linked account | account reference |
| `POST /api/game/activate` | Activate after entitlement evidence | `ActivationRecord` |
| `POST /api/game/revoke` | Revoke old owner access | updated record |
| `POST /api/game/retry` | Retry pending delivery idempotently | same updated record |
| `GET /api/game/status/:wallet/:designId` | Read current access | activation status |

Rules:

- JSON uses the frozen TypeScript field names.
- API errors return `{ code, message, recoverable, details? }`.
- Same transaction hash and action may not create two activation records.
- Game account IDs and authentication data never go on-chain.
- AI pre-screening does not claim to prove ownership.

## 8. Transaction UI states

Every blockchain write follows:

```text
IDLE -> AWAITING_SIGNATURE -> PENDING -> CONFIRMED
                                  \-> REVERTED
```

The UI must expose actor, function, amount when relevant, transaction hash, emitted event or revert reason, and resulting business state.

## 9. Custom-error baseline

Canonical errors include:

```text
UnauthorizedRole
DesignNotFound
InvalidStateTransition
DesignIsSuspended
InvalidBpsTotal
InvalidContractAddress
DependencyAlreadyConfigured
VotingNotOpen
VotingStillOpen
AlreadyVoted
IneligibleCandidate
NotMarketReady
AuctionNotActive
AuctionStillOpen
BidBelowMinimum
ReserveNotMet
AlreadySettled
NothingToWithdraw
DirectTransferDisabled
NotEntitlementOwner
EntitlementNotTransferable
ListingNotActive
SellerNoLongerOwner
```

Frontend text may be more readable, but code and event parsers use the canonical names.

## 10. Change-request process

Open a change request using `.github/ISSUE_TEMPLATE/change-request.md`. Include:

1. Current interface.
2. Proposed interface.
3. Why the current interface blocks implementation.
4. Impact on Solidity/ABI, Kat APIs, Văn tests/evidence and Nhật UI.
5. Required migration or fixture changes.

Only Nhật merges the approved shared change and publishes the replacement baseline commit.
