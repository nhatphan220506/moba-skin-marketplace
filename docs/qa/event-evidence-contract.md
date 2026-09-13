# Văn event and evidence contract

Owner: Văn  
ABI/signature owner: Nhật

## Evidence row

Every mandatory event must normalize into `EvidenceRow` from `types/evidence.ts`. The parser must not depend on page styling or Kat's internal database format.

Minimum displayed evidence:

- transaction hash;
- block number;
- contract name;
- event name;
- actor;
- design/auction/token ID when present;
- amount when present;
- state before and after when meaningful.

## Expected accounting fixture

Primary:

```text
Buyer A bids 120 -> escrow 120
Buyer B bids 150 -> escrow 150; Buyer A pending refund 120
Buyer A withdraws -> Buyer A receives 120
Settlement -> Artist 120; Publisher 15; Marketplace 15
Buyer B entitlement balance -> 1
```

Resale:

```text
Buyer B lists at 200
Buyer C buys -> Buyer C -200
Seller +180; Artist +10; Publisher +6; Marketplace +4
Buyer B entitlement -> 0; Buyer C entitlement -> 1
Buyer B access -> REVOKED; Buyer C access -> ACTIVE
```

## Mandatory failure coverage

- Wrong role for every privileged function.
- Invalid design state transition.
- Voting before/after window, double voting and ineligible candidate.
- Auction creation before market-ready.
- Low bid, early settlement, double settlement and suspended design.
- Escrow/refund/proceeds accounting invariant.
- Supply cap exceeded and unauthorised entitlement mint.
- Direct transfer blocked.
- Resale by non-owner, inactive listing, insufficient approval and repeat purchase.
- Event redelivery does not duplicate mock game activation.

## Handoff to Nhật

Văn supplies:

- tests and fixtures;
- clean deploy/reset/seed scripts;
- full journey log;
- normalized evidence parser;
- functional unstyled evidence component;
- defect log and release recommendation.

Nhật owns final styling and application integration.
