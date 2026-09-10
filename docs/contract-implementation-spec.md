# MOBA Skin Marketplace Contract Implementation Specification

## 1. Document status

- Owner: Nhật, Technical Lead
- Target path in repository: `docs/contract-implementation-spec.md`
- Applies to: N2 Contract Logic, N3 Deployment and Blockchain Client
- Baseline: `m0-interface-freeze`
- Solidity: `0.8.24`
- Contract library: OpenZeppelin Contracts `5.4.x`
- Network: Hardhat local chain, chain ID `31337`

This specification converts the frozen M0 business interfaces into an implementable smart-contract design. It defines state ownership, contract dependencies, roles, money accounting, entitlement transfer rules, security invariants, deployment order and completion gates. The prototype uses MockVND and local accounts only. It does not represent real VND, real Riot or Garena integration, copyright ownership or unrestricted game-asset ownership.

## 2. Frozen prototype decisions

The following decisions are already approved and must not be reopened during implementation unless a documented change request is accepted.

| Item | Frozen decision |
| --- | --- |
| Design | One demo design with `designId = 1` |
| Edition | `tokenId = designId`; demo `tokenId = 1`; `maxSupply = 1` |
| Primary reserve | 100 MockVND |
| Primary bids | Buyer A bids 120; Buyer B bids 150 |
| Primary split | Artist 80%; Publisher 10%; Marketplace 10% |
| Resale price | 200 MockVND |
| Resale split | Seller 90%; Artist 5%; Publisher 3%; Marketplace 2% |
| Buyer right | Limited publisher-authorised usage entitlement |
| Excluded right | Copyright, character IP, game IP and unrestricted commercial rights |
| Storage | Detailed files off-chain; URI, hash, approvals, transaction state and ownership on-chain |
| Game delivery | Event-driven mock game backend; no real publisher API |

## 3. Design principles

1. Each business fact has one authoritative owner.
2. Contracts query authoritative contracts instead of trusting frontend booleans.
3. Privileged functions use least-privilege role checks.
4. State transitions must be explicit and irreversible unless an approved exception path exists.
5. Payment accounting uses escrow plus pull refunds and pull proceeds.
6. External token transfers follow checks, effects and interactions and use a reentrancy guard.
7. Direct entitlement transfer is disabled so users cannot bypass resale royalty.
8. Off-chain delivery failure never rewrites confirmed on-chain ownership.
9. Every mandatory state-changing action emits the frozen evidence event.
10. No production contract is considered complete until it compiles and Văn's relevant tests pass.

## 4. Canonical state ownership

| Business fact | Authoritative component | Consumer |
| --- | --- | --- |
| Creator, metadata URI and provenance hashes | `AssetRegistry` | Voting, Auction, UI and Evidence |
| Verification decision | `AssetRegistry` | Voting and Auction |
| Publisher concept eligibility | `AssetRegistry` | Voting and Auction |
| Commercial agreement hash and artist BPS | `AssetRegistry` | Primary and Secondary markets |
| Design suspension | `AssetRegistry` | All downstream contracts |
| Voting candidates, votes and winner | `CommunityVoting` | Agreement, Auction and UI |
| Production hashes, technical approval and max supply | `CompatibilityRegistry` | Auction and Entitlement |
| Mock payment balance and allowance | `MockVND` | Primary and Secondary markets |
| Token supply, balance and authorised transfer | `SkinEntitlement1155` | Primary, Secondary and Game adapter |
| Bid, escrow, pending refund and primary proceeds | `PrimaryAuction` | Buyer, recipients, UI and Evidence |
| Listing, resale proceeds and entitlement transfer | `SecondaryMarketplace` | Seller, buyer, recipients, UI and Evidence |
| Wallet-to-game-account mapping and access status | Kat mock game backend | Inventory and UI |

### 4.1 Aggregate lifecycle rule

The full product lifecycle is a derived view assembled from several authoritative contracts. No generic `setStatus` function will be added.

`AssetRegistry.status` records only registry-owned states such as submission, revision, verification, publisher eligibility, agreement, suspension and cancellation. Later UI states are derived as follows:

| Derived UI state | Authoritative condition |
| --- | --- |
| `VOTING` | Active voting round contains the design |
| `SELECTED` | `CommunityVoting.isVotingWinner(designId) == true` |
| `IN_PRODUCTION` | Agreement exists and production record exists |
| `TECHNICAL_REVIEW` | Production submitted with pending QA |
| `REWORK_REQUIRED` | Compatibility QA status is rework |
| `MARKET_READY` | Full market gate passes |
| `AUCTION_OPEN` | Primary auction status is open |
| `ENTITLEMENT_ISSUED` | Entitlement supply for `tokenId` is greater than zero |

This avoids duplicating the same fact across contracts and prevents state disagreement.

## 5. Contract dependency topology

```text
AssetRegistry
├── CommunityVoting reads verification, eligibility and suspension
├── CompatibilityRegistry reads agreement and suspension
├── PrimaryAuction reads verification, eligibility, agreement and suspension
└── SecondaryMarketplace reads creator, commercial terms and suspension

CommunityVoting
├── AssetRegistry optionally reads winner before recording agreement
└── PrimaryAuction reads final winner

CompatibilityRegistry
├── SkinEntitlement1155 reads maxSupply
└── PrimaryAuction reads technical approval and maxSupply

MockVND
├── PrimaryAuction uses transferFrom and transfer
└── SecondaryMarketplace uses transferFrom and transfer

SkinEntitlement1155
├── PrimaryAuction receives mint authority
└── SecondaryMarketplace receives transfer authority
```

The frontend may display a calculated gate but is never authoritative.

## 6. Role and permission matrix

Use OpenZeppelin `AccessControl` in each contract. `DEFAULT_ADMIN_ROLE` belongs to the demo admin account. Role administration remains local-demo only.

| Role | Permitted actions |
| --- | --- |
| Admin | Grant/revoke roles, configure trusted contract addresses, suspend/reinstate, pause/unpause, emergency-cancel auction |
| Artist | Submit design; resubmit after revision |
| Verifier | Request revision; verify design |
| Publisher | Approve concept eligibility; record agreement; submit production; create auction |
| Game Developer | Approve compatibility; require rework |
| Fan | Vote once in an active round |
| Buyer/Seller | Approve MockVND; bid; withdraw refund; withdraw proceeds; list; cancel own listing; buy resale |
| Marketplace | Operate settlement or administration actions explicitly assigned by the prototype |
| Primary Auction contract | Mint entitlement after valid settlement |
| Secondary Marketplace contract | Perform authorised entitlement transfer |

### 6.1 Role constants

Use stable role identifiers:

```solidity
bytes32 public constant ARTIST_ROLE = keccak256("ARTIST_ROLE");
bytes32 public constant VERIFIER_ROLE = keccak256("VERIFIER_ROLE");
bytes32 public constant PUBLISHER_ROLE = keccak256("PUBLISHER_ROLE");
bytes32 public constant GAME_DEVELOPER_ROLE = keccak256("GAME_DEVELOPER_ROLE");
bytes32 public constant FAN_ROLE = keccak256("FAN_ROLE");
bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
bytes32 public constant MARKETPLACE_ROLE = keccak256("MARKETPLACE_ROLE");
bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
```

Buyer actions do not require a buyer role unless the demo explicitly whitelists buyer wallets. Creator bidding must still be rejected.

## 7. Contract specifications

### 7.1 AssetRegistry

#### Storage

- Monotonic `nextDesignId`, starting at 1.
- `mapping(uint256 => DesignRecord) designs`.
- `mapping(uint256 => CommercialTerms) commercialTerms`.
- `mapping(uint256 => address) publisherByDesign`.
- Configured `CommunityVoting` address if winner enforcement is approved.

#### Commercial terms

```solidity
struct CommercialTerms {
    uint16 artistPrimaryShareBps;
    uint16 artistResaleRoyaltyBps;
    bool recorded;
}
```

#### Required behavior

| Function | Required logic |
| --- | --- |
| `submitDesign` | Artist role; non-empty URI; non-zero required hashes; create ID; store creator; set Submitted; emit `DesignSubmitted` |
| `requestRevision` | Verifier role; current state Submitted; store RevisionRequired; emit `DesignRevisionRequested` |
| `verifyDesign` | Verifier role; Submitted; not suspended; non-zero report hash; set verified and Verified; emit `DesignVerified` |
| `approveConceptEligibility` | Publisher role; verified; not suspended; store publisher and review hash; set eligible; emit `ConceptEligibilityUpdated` |
| `recordAgreement` | Publisher role; eligible; voting winner if configured; not suspended; non-zero agreement hash; validate BPS; store terms; emit `AgreementRecorded` |
| `suspendDesign` | Admin or risk authority; existing design; store previous operational state if restoration requires it; emit `DesignSuspended` |
| `reinstateDesign` | Admin or risk authority; currently suspended; restore allowed state; emit `DesignReinstated` |

#### Invariants

- A design ID is never reused.
- Creator does not change after submission.
- Verification and agreement hashes cannot be silently overwritten.
- Suspension does not delete evidence or money accounting.
- Agreement BPS must produce an exact 10,000 BPS split with the configured publisher and marketplace shares.

### 7.2 CommunityVoting

#### Storage

- `mapping(uint256 => VotingRound) rounds`.
- Candidate eligibility per round.
- Vote count per round and design.
- `hasVoted[roundId][wallet]`.
- Final winner mapping by design.
- Reference to `AssetRegistry`.

#### Required behavior

| Function | Required logic |
| --- | --- |
| `openVoting` | Admin; valid time range; at least one candidate; every candidate verified, publisher eligible and not suspended |
| `vote` | Active time window; Fan role if demo whitelist is enabled; eligible candidate; wallet has not voted |
| `finalizeVoting` | Deadline passed; not finalised; determine winner; store winner; emit final evidence |

Tie policy for the prototype: choose the eligible design with the lowest `designId` among designs with the highest vote count. The demo fixture should avoid a tie, but the contract outcome remains deterministic.

### 7.3 CompatibilityRegistry

#### Storage

- Latest `ProductionRecord` per design.
- Optional version counter or version-hash history.
- Reference to `AssetRegistry`.

#### Required behavior

| Function | Required logic |
| --- | --- |
| `submitProduction` | Publisher role; agreement exists; design not suspended; non-zero hashes; set Pending |
| `approveCompatibility` | Game Developer role; production exists; maxSupply greater than zero; design not suspended; set Approved |
| `requireRework` | Game Developer role; production exists; set ReworkRequired; emit reason evidence |

Production files remain off-chain. Only hashes, version, approved game hash, QA state and maximum supply are on-chain.

### 7.4 MockVND

Implement using OpenZeppelin ERC-20 plus role-controlled minting.

#### Decisions

- Name: `Mock Vietnamese Dong`.
- Symbol: `mVND`.
- Decimals: 18 for compatibility with existing demo configuration.
- Only `MINTER_ROLE` may mint.
- Mint only to local demo accounts.
- No redemption, oracle, payment gateway or real currency representation.

`approve` creates allowance only. Payment occurs when an authorised marketplace contract executes `transferFrom`.

### 7.5 SkinEntitlement1155

Implement using OpenZeppelin ERC-1155, AccessControl and Pausable.

#### Decisions

- `tokenId = designId` for the prototype.
- `maxSupply` is read from `CompatibilityRegistry`.
- PrimaryAuction receives `MINTER_ROLE` after deployment.
- SecondaryMarketplace receives `MARKETPLACE_ROLE` after deployment.
- Direct user-to-user transfers revert with `DirectTransferDisabled`.
- Mint and burn remain possible only through authorised paths.
- Metadata URI comes from the design or an agreed entitlement metadata URI.

#### Transfer restriction

For a non-mint and non-burn transfer, the caller must be an authorised SecondaryMarketplace. The check must apply to ERC-1155 single and batch transfer paths so users cannot bypass the royalty rule.

### 7.6 PrimaryAuction

Use OpenZeppelin `ReentrancyGuard` and `SafeERC20`.

#### Dependencies

- AssetRegistry.
- CommunityVoting.
- CompatibilityRegistry.
- MockVND or IERC20 payment token.
- SkinEntitlement1155.
- Publisher treasury.
- Marketplace treasury.

#### Market-ready gate

`createAuction` must read and enforce all conditions:

```text
AssetRegistry.isVerified(designId)
AND AssetRegistry.isPublisherEligible(designId)
AND CommunityVoting.isVotingWinner(designId)
AND AssetRegistry.hasAgreement(designId)
AND CompatibilityRegistry.isTechnicallyApproved(designId)
AND CompatibilityRegistry.getMaxSupply(designId) > 0
AND AssetRegistry.isSuspended(designId) == false
```

#### Bid accounting

When a new highest bid is accepted:

1. Validate auction status and time.
2. Validate amount against reserve or minimum increment.
3. Reject the design creator as bidder.
4. Pull the new full bid into escrow using `transferFrom`.
5. Move the previous highest bid into `pendingReturns`.
6. Update highest bidder and highest bid.
7. Emit `RefundAvailable` when applicable.
8. Emit `BidPlaced`.

Do not refund the previous bidder inside `placeBid`.

#### Escrow invariant

At every successful transaction:

```text
paymentToken.balanceOf(PrimaryAuction)
>= activeHighestBids
 + totalPendingReturns
 + totalPendingProceeds
```

#### Settlement

- Only after end time.
- Only once.
- Design must not be suspended.
- Reserve must be met.
- Effects are recorded before token mint or payment transfer.
- Winning price is allocated to pull-based recipient proceeds.
- Entitlement is minted to the winner.
- `tokenId = designId`.
- Emit `AuctionSettled` only after all settlement conditions succeed.

Primary example for 150 MockVND:

| Recipient | BPS | Amount |
| --- | ---: | ---: |
| Artist | 8,000 | 120 |
| Publisher | 1,000 | 15 |
| Marketplace | 1,000 | 15 |

Use integer math in token base units. The final recipient receives any deterministic rounding remainder so allocated amounts always equal the final price.

#### Withdrawal

- `withdrawRefund` and `withdrawProceeds` use pull payment.
- Set the stored amount to zero before external token transfer.
- Protect withdrawal and settlement entry points with `nonReentrant`.

### 7.7 SecondaryMarketplace

Use OpenZeppelin `ReentrancyGuard` and `SafeERC20`.

#### Dependencies

- AssetRegistry.
- MockVND or IERC20 payment token.
- SkinEntitlement1155.
- Publisher treasury.
- Marketplace treasury.

#### Listing rules

- Seller owns one transferable entitlement.
- Price is greater than zero.
- Design is not suspended.
- One active listing per token-owner combination in the prototype.
- Listing stores seller, designId, tokenId and price.

#### Purchase rules

1. Listing is active.
2. Seller still owns the entitlement.
3. Buyer is not the seller.
4. Design is not suspended.
5. Mark listing inactive before external interactions.
6. Pull full payment from buyer.
7. Record or distribute the exact split.
8. Execute authorised entitlement transfer.
9. Emit `ResaleCompleted`.

Resale example for 200 MockVND:

| Recipient | BPS | Amount |
| --- | ---: | ---: |
| Seller | 9,000 | 180 |
| Artist | 500 | 10 |
| Publisher | 300 | 6 |
| Marketplace | 200 | 4 |

Payment and entitlement transfer are atomic. If either fails, the entire transaction reverts.

## 8. Suspension and emergency behavior

Suspension must stop new risky activity without trapping valid accounting claims.

| Action while suspended | Rule |
| --- | --- |
| Submit a new unrelated design | Allowed |
| Verify suspended design | Blocked |
| Open voting for suspended design | Blocked |
| Record agreement | Blocked |
| Approve compatibility | Blocked |
| Create auction | Blocked |
| Place new bid | Blocked |
| Settle suspended design | Blocked pending reinstate or cancellation |
| Withdraw an existing refund | Allowed |
| Withdraw valid proceeds already recorded | Allowed |
| Create resale listing | Blocked |
| Buy suspended listing | Blocked |

Emergency cancellation must preserve bidder refunds and historical events. It must never erase balances or entitlement history.

## 9. Approved controlled interface changes

The frozen skeleton does not currently expose every function required to enforce the approved master flow. CR-001 authorises the following additive changes.

### CR-001 Approved additions

Decision status: APPROVED

These additions are authorised for implementation. Existing function names, event names, parameters and shared API fields remain unchanged.

| Contract | Addition | Reason |
| --- | --- | --- |
| AssetRegistry | Configure trusted CommunityVoting address | Enforce that only a voting winner can record agreement without circular constructor deployment |
| AssetRegistry | `getCommercialTerms(designId)` | Primary and Secondary markets must read artist BPS on-chain |
| PrimaryAuction | `cancelAuction(auctionId)` and cancellation event | Master flow includes cancellation and emergency suspension behavior |
| PrimaryAuction | `AuctionClosedUnsold` event | AuctionStatus includes Unsold and requires an explicit evidence surface |
| SkinEntitlement1155 | `pause()` and `unpause()` | Skeleton contains `EntitlementPaused` but no callable administrative control |

These are additive changes. Existing frozen function names and event parameters must remain unchanged. Under approved CR-001:

1. Update `docs/interfaces.md`.
2. Update the Solidity skeletons.
3. Update ABI expectations.
4. Send the new shared-interface commit hash to Kat and Văn.
5. Ask both contributors to merge the shared commit before continuing affected work.

Rejected additions:

- No generic `setStatus` function.
- No per-design publisher payment recipient.
- No additional smart contract.

## 10. Deployment specification

### 10.1 Deployment order

1. Deploy AssetRegistry with initial admin.
2. Deploy CommunityVoting with AssetRegistry address.
3. Configure CommunityVoting as a trusted dependency in AssetRegistry under approved CR-001.
4. Deploy CompatibilityRegistry with AssetRegistry address.
5. Deploy MockVND with initial admin/minter.
6. Deploy SkinEntitlement1155 with AssetRegistry and CompatibilityRegistry addresses.
7. Deploy PrimaryAuction with all registries, MockVND, Entitlement, publisher treasury and marketplace treasury.
8. Grant PrimaryAuction the Entitlement `MINTER_ROLE`.
9. Deploy SecondaryMarketplace with AssetRegistry, MockVND, Entitlement and treasury addresses.
10. Authorise SecondaryMarketplace to transfer entitlements.
11. Grant actor roles using the frozen signer mapping.
12. Mint demo MockVND balances.
13. Save addresses to `deployments/localhost.json`.
14. Export ABIs to `lib/contracts/*.abi.json`.

### 10.2 Deployment assertions

The deployment script must fail if:

- Any dependency address is zero.
- Chain ID is not 31337.
- Required roles were not granted.
- PrimaryAuction lacks mint authority.
- SecondaryMarketplace lacks transfer authority.
- Primary or resale BPS do not equal 10,000.

## 11. Security review checklist

- [ ] Every privileged function has the correct role check.
- [ ] `DEFAULT_ADMIN_ROLE` is granted intentionally and not to multiple accidental accounts.
- [ ] Every design ID, round ID, auction ID and listing ID is monotonic and never reused.
- [ ] Invalid state transitions revert.
- [ ] Market readiness is queried from authoritative contracts.
- [ ] Frontend-supplied eligibility is never trusted.
- [ ] Bid escrow and pending balances reconcile.
- [ ] Refunds and proceeds use pull payment.
- [ ] External payment calls use SafeERC20.
- [ ] Settlement, withdrawal and resale purchase use reentrancy protection.
- [ ] Effects are recorded before external calls.
- [ ] Settlement cannot execute twice.
- [ ] Total BPS equals 10,000.
- [ ] Allocated base units equal the paid amount after rounding.
- [ ] Entitlement supply never exceeds technical maxSupply.
- [ ] Only PrimaryAuction can mint after deployment.
- [ ] Direct ERC-1155 transfer is blocked.
- [ ] Only SecondaryMarketplace can perform an authorised resale transfer.
- [ ] Suspension blocks new activity but not valid refund/proceeds withdrawal.
- [ ] No off-chain game delivery failure rolls back blockchain ownership.

## 12. Implementation sequence and commit gates

| Gate | Work | Required result |
| --- | --- | --- |
| N2.0 | Approve this specification and CR-001 | Kat and Văn receive shared-change notice if needed |
| N2.1 | MockVND | Compile; mint, approve and transferFrom behavior available |
| N2.2 | AssetRegistry | Role/state checks and commercial terms compile |
| N2.3 | CommunityVoting | Candidate gate, one-wallet-one-vote and finalisation compile |
| N2.4 | CompatibilityRegistry | Agreement gate, QA and maxSupply compile |
| N2.5 | SkinEntitlement1155 | Supply cap, minter role and transfer restriction compile |
| N2.6 | PrimaryAuction | Market gate, bid, escrow, refund, settlement and split compile |
| N2.7 | SecondaryMarketplace | Listing, atomic purchase, royalty and transfer compile |
| N2.8 | Regression | Văn's mandatory success and failure tests pass |
| N3.0 | Deployment | Clean deploy, role grants, address and ABI export pass |

Recommended commits:

```text
docs: add contract implementation specification
feat: implement mock payment token
feat: implement asset registry and commercial terms
feat: implement community voting
feat: implement compatibility registry
feat: implement restricted skin entitlement
feat: implement primary auction accounting
feat: implement authorised resale and royalty
fix: resolve contract regression findings
chore: add local deployment addresses and ABI exports
```

## 13. Definition of done

Contract implementation is complete only when:

- All seven contracts compile from a clean install.
- Frozen functions, events and custom errors remain compatible, except approved additive changes.
- Every privileged action rejects the wrong role.
- Market readiness is enforced on-chain.
- Buyer A can withdraw the full 120 MockVND refund.
- Primary proceeds equal 120, 15 and 15.
- Entitlement supply and winner ownership are correct.
- Direct entitlement transfer fails.
- Resale proceeds equal 180, 10, 6 and 4.
- Buyer B entitlement becomes zero and Buyer C entitlement becomes one.
- Suspension and emergency paths preserve refund/proceeds accounting.
- Mandatory events normalize into Văn's `EvidenceRow`.
- Clean deploy and reset scripts reproduce the same full journey twice.

## 14. Immediate next actions for Nhật

1. Review and approve the state-ownership and economic-term decisions in this file.
2. Open CR-001 for the additive interface gaps.
3. Inform Kat and Văn before changing shared interfaces.
4. Commit this specification to `feature/nhat-core` or an approved shared-change branch.
5. Implement MockVND as the first low-dependency contract.
6. Implement AssetRegistry after CR-001 is resolved.
7. Compile after each contract and push a checkpoint commit for Văn.
