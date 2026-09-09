# Masterplan summary

The prototype represents a technology provider delivering an authorised marketplace solution to a MOBA publisher such as Riot or Garena. Independent artists submit original skin concepts; the publisher retains its pre-existing character and game IP. A selected artist grants agreed commercialisation and derivative-production rights while retaining attribution and agreed economic participation.

The buyer receives a limited, publisher-authorised usage entitlement. The entitlement is not copyright, game ownership or a universal right to use the skin across unrelated games.

## Market-ready condition

```text
verified
AND publisherEligible
AND votingWinner
AND agreementRecorded
AND technicallyApproved
AND maxSupply > 0
AND suspended == false
= MARKET_READY
```

The auction contract must query authoritative registries. It must never trust a `marketEligible` boolean supplied by the frontend.

## On-chain responsibilities

- Actor authority and role checks.
- Hashes and state transitions for approvals.
- Voting records and winner finalisation.
- Auction rules, MockVND escrow, pull refunds and settlement.
- Revenue receivables and withdrawal accounting.
- Entitlement minting and authorised resale transfer.
- Resale royalty calculation.
- Immutable transaction and event evidence.

## Off-chain responsibilities

- Identity/KYC data and detailed legal documents.
- Concept files, AI disclosure and provenance evidence.
- Automated risk screening and human-review details.
- 3D production files, game packages and detailed QA reports.
- Wallet-to-game-account mapping.
- Game activation, revocation, retry and support workflow.
- Search, ratings and general marketplace presentation.

## Demo baseline

- One concept: `designId = 1`.
- One edition: `maxSupply = 1`.
- Primary reserve: 100 MockVND.
- Buyer A bids 120; Buyer B bids 150 and wins.
- Primary split: Artist 80%, Publisher 10%, Marketplace 10%.
- Buyer A withdraws the outbid refund.
- Buyer B receives the entitlement and ACTIVE mock game access.
- Buyer B resells for 200 MockVND to Buyer C.
- Resale split: Seller 90%, Artist 5%, Publisher 3%, Marketplace 2%.
- Buyer B access becomes REVOKED and Buyer C access becomes ACTIVE.

The complete narrative, architecture and exception paths remain in `Masterplan_Final.docx`.
