# Mock Game API

Base URL: `http://localhost:3000`. Game account identifiers remain off-chain, and no password, token, private key, or KYC data is accepted or stored.

## Account linking

### POST /api/accounts/link

```json
{
  "walletAddress": "0x23618e81E3f5cdF7f54C3d65f7FBc0aBf5B21E8f",
  "gameAccountId": "moba-player-b"
}
```

Returns the frozen `AccountLink` shape with `status: "LINKED"`. Repeating the same mapping is idempotent. A wallet or game account already linked elsewhere returns `409 CONFLICT`.

### GET /api/accounts/:wallet

Returns the linked `AccountLink`. Errors: `400 VALIDATION_ERROR` for an invalid address and `404 NOT_FOUND` when no active link exists.

## Entitlement evidence

The prototype accepts normalized, receipt-shaped evidence. It validates field shape and exact event names but does not independently query the blockchain or prove receipt authenticity.

Mint evidence:

```json
{
  "transactionHash": "0x1111111111111111111111111111111111111111111111111111111111111111",
  "eventName": "EntitlementMinted",
  "designId": 1,
  "tokenId": 1,
  "amount": 1,
  "owner": "0x23618e81E3f5cdF7f54C3d65f7FBc0aBf5B21E8f"
}
```

Transfer evidence uses `eventName: "EntitlementTransferred"`, `previousOwner`, and `newOwner`. Wallets must be nonzero and different, IDs must be positive integers, the amount must equal one, and the target wallet must have a linked game account.

## Game delivery

### POST /api/game/activate

The frozen minimum payload remains supported:

```json
{
  "walletAddress": "0x23618e81E3f5cdF7f54C3d65f7FBc0aBf5B21E8f",
  "gameAccountId": "moba-player-b",
  "designId": 1,
  "tokenId": 1,
  "transactionHash": "0x1111111111111111111111111111111111111111111111111111111111111111"
}
```

The linked game account must match the wallet. The normalized event-evidence form is:

```json
{ "evidence": { "transactionHash": "0x1111111111111111111111111111111111111111111111111111111111111111", "eventName": "EntitlementMinted", "designId": 1, "tokenId": 1, "amount": 1, "owner": "0x23618e81E3f5cdF7f54C3d65f7FBc0aBf5B21E8f" } }
```

Returns an `ActivationRecord` plus internal `action` and `eventName` evidence fields. Normal delivery returns `ACTIVE`. Repeating the same transaction/action/design/token returns the original record without duplication.

### POST /api/game/revoke

The frozen flat payload is also accepted, using the previous owner's wallet and linked game account. The normalized transfer-evidence form is:

```json
{ "evidence": { "transactionHash": "0x2222222222222222222222222222222222222222222222222222222222222222", "eventName": "EntitlementTransferred", "designId": 1, "tokenId": 1, "amount": 1, "previousOwner": "0x23618e81E3f5cdF7f54C3d65f7FBc0aBf5B21E8f", "newOwner": "0xa0Ee7A142d267C1f36714E4a8F75612F20a79720" } }
```

Returns a distinct `REVOKED` action record for the previous owner. The internal `syncEntitlementEvent()` function performs this revocation before activating the new owner.

### POST /api/game/retry

```json
{ "activationId": "activation-0123456789ab" }
```

Only `DELIVERY_PENDING` activation records are changed. Retry increments `attemptCount`, clears `lastError`, and returns `ACTIVE`. Retrying an already active record returns it unchanged.

The seeded Buyer C account is `moba-player-c-pending-once`, so its first activation returns `DELIVERY_PENDING` and the retry succeeds. Blockchain ownership is never rolled back.

### GET /api/game/status/:wallet/:designId

Returns the newest activation or revocation record for that wallet and design. Errors: `400 VALIDATION_ERROR` for malformed input and `404 NOT_FOUND` when no history exists.

## Idempotency and resale order

The key is `transactionHash + action + designId + tokenId`. One transfer transaction can therefore safely create one `REVOKE` record and one `ACTIVATE` record. Re-delivery returns those records rather than adding duplicates.

`eventSync.ts` processes resale in this order:

```text
validate EntitlementTransferred
revoke previousOwner
activate newOwner
```

Invalid evidence creates no record. Historical entries are append-only.

## Limitations

This is not a real Riot/Garena API, authentication service, blockchain indexer, or entitlement oracle. It validates normalized receipt-shaped data supplied by the trusted local demo flow. JSON storage is intended for one local process and is not a production database.
