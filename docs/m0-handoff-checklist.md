# M0 handoff checklist

## Nhật completes before release

- [ ] Masterplan final is stored under `docs/masterplan/`.
- [ ] Personal task files are stored under `docs/handover/`.
- [ ] Folder ownership is documented.
- [ ] Demo identifiers, prices, BPS and actor roles are frozen.
- [ ] Shared TypeScript interfaces are complete.
- [ ] Seven Solidity interface skeletons compile.
- [ ] Functions, events, errors, APIs and evidence mapping are documented.
- [ ] `.env.example` contains no secret.
- [ ] Clean install/typecheck/compile instructions are correct.
- [ ] Baseline commit is tagged `m0-interface-freeze`.
- [ ] Role branches exist from the exact baseline commit.
- [ ] Kat and Văn receive the repository link, commit/tag and individual task file.

## Kat start confirmation

- [ ] Can identify owned folders.
- [ ] Can import Design, VerificationReport and ActivationRecord.
- [ ] Understands required API routes and response fields.
- [ ] Understands game activation idempotency.
- [ ] Has no need to change contract event names to begin.

## Văn start confirmation

- [ ] Can identify owned folders.
- [ ] Has frozen contract functions, events and custom errors.
- [ ] Has expected primary/resale balances.
- [ ] Can create fixtures and failing tests before N2 implementation.
- [ ] Understands the `EvidenceRow` output expected by Nhật.
