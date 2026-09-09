# Folder ownership and integration rules

## Nhật: shared foundation, contracts, integration and final UI/UX

Owns:

- `app/`, excluding `app/api/`
- `components/ui/`
- `contracts/`
- `lib/blockchain/`
- `types/`
- `config/`
- root configuration files
- final merge, version freeze and release README

## Kat: off-chain services and mock game backend

Owns:

- `app/api/`
- `lib/server/`
- `lib/mock-game/`
- `data/`
- `docs/api/`

Kat consumes frozen types and config but does not edit them directly.

## Văn: testing, automation and blockchain evidence

Owns:

- `test/`
- `scripts/demo/`
- `lib/evidence/`
- `components/technical/`
- `docs/qa/`

Văn may write failing tests against frozen interfaces before implementation exists. Văn reports contract defects to Nhật and does not change production contract logic to make a test pass.

## Shared-change rule

A change request is required for any modification to:

- field names or shared types;
- roles and demo constants;
- Solidity function signatures;
- event names or event parameters;
- custom errors;
- API routes or response shapes;
- revenue BPS or expected balances;
- lifecycle or market-ready conditions.

The request must state the reason and impact on contracts, API, tests, evidence and UI. Nhật merges the approved shared change and communicates the new baseline commit.

## Definition of done

A task is not done because a screen or file exists. It is done only when the relevant code compiles, the documented request/response or transaction runs, tests pass where available, and the full journey can consume its output.
