# Kat off-chain integration report

## Decision

`KAT INTEGRATION CONDITIONALLY ACCEPTED — BLOCKERS LISTED`

Kat's module is functionally accepted for Văn's local QA: type checking, contract compilation, production build, 58 runtime contract tests, the complete 18-request API flow, and seven additional API assertions pass. The conditional status is caused by repository provenance and release-process blockers, not a failing Kat behavior.

## Repository provenance

| Item | Verified value |
|---|---|
| Repository | `https://github.com/nhatphan220506/moba-skin-marketplace.git` |
| Remote `main` | `4b9d550bcc9789c96e96bb3a31fb87e7985fcaad` |
| Remote Kat source | `1d3cb97b79db511084d487cfc3a5b70dfe65f12c` |
| Observed merge base | `75fc4459937a2a38b7e442ec2a6ee8f453bbd988` |
| Reported frozen baseline | `a51ed782d22e08a9ac739bf043d036157b8e47f1` — not present on GitHub |
| Reported tag | `m0-interface-freeze` — no remote tag exists |
| Verified integration code/evidence commit | `84741d06554eab19a914cbaea4199b218704bdf0` |

GitHub showed Kat as 21 commits ahead and 15 commits behind `main`. Kat's exact diff from the observed merge base was 45 files, +1,830/-14, confined to `app/api/`, `lib/server/`, `lib/mock-game/`, `data/`, and `docs/api/`. No out-of-scope Kat file was found.

Terminal Git authentication was unavailable. The three exact, authenticated GitHub archive trees (merge base, `main`, and Kat tip) were therefore imported into a local synthetic Git graph. Local mapping:

- `91e57a7474b6319e58f853bc7e32e5b28af5f9d1` → observed remote merge-base tree `75fc445...`
- `50397798b35058adf72f763fabdf836101c5ce39` → remote `main` tree `4b9d550...`
- `57828c04aa05d5b8e4edae6fc3305718a3227c47` → remote Kat tree `1d3cb97...`

This preserves and verifies file content but not the original remote Git object ancestry. Do not push this synthetic history. Recreate or cherry-pick the integration changes onto an authenticated real clone before opening a PR.

## Merge

- Branch: `integration/kat-offchain`, created from the verified latest `main` tree.
- Method: `git merge --no-ff feature/kat-offchain`, default `ort` strategy.
- Local merge commit: `160dd4a90f47832edbd725024a61550cf9d5b99b`.
- Conflicts: none.
- Unrelated user work overwritten: none; this was a new isolated workspace.

## Integration changes

Commit `84741d06554eab19a914cbaea4199b218704bdf0` adds:

- `components/ui/KatIntegrationDashboard.tsx`: real local API controls for artist submission, verification, production/QA, account linking, primary activation, resale sync, pending delivery, and retry.
- `lib/blockchain/katEventAdapter.ts`: typed boundary for normalized `EntitlementMinted` and `EntitlementTransferred` evidence. Transfer order is revoke previous owner, then activate new owner.
- `scripts/integration/run-kat-api-acceptance.mjs`: reproducible deterministic acceptance runner.
- `docs/integration/evidence/kat-api-results.json` and `kat-api-run.log`: machine-readable and concise evidence.
- `app/page.tsx` and `app/globals.css`: functional integration console and accurate status/error presentation.
- `.gitignore`: permits committing only the integration evidence log while keeping other logs ignored.

Kat endpoints and frozen payloads were not changed. The adapter and UI are additive.

## Verification

Environment: Node `v24.19.0`, npm `11.17.0`, Git `2.39.5`.

| Command | Result |
|---|---|
| `npm ci` | PASS; lockfile-compatible install |
| `npm run check` | PASS: M0 foundation, TypeScript, 35 Solidity files compiled |
| `npm run test:contracts` | PASS: 58 passing, 0 failing, 0 pending |
| `npm run build` | PASS: Next.js 15.5.25, 14 application/API routes generated |
| `node scripts/integration/run-kat-api-acceptance.mjs` | PASS after clean dev-server restart: 25/25 HTTP checks |
| Chrome manual render smoke test at `http://localhost:3000` | PASS: all four connected areas, controls, authority warning, fixture warning, and status surfaces rendered |
| `npm audit --json` | REVIEW REQUIRED: 63 findings (14 low, 40 moderate, 9 high, 0 critical) |

The API result contains 18/18 collection requests and 7/7 additional checks. It verifies upload/metadata, deterministic SHA-256, standard errors, pre-screen and human report persistence, production version history, link idempotency/conflict, Buyer B activation, mint re-delivery idempotency, revoke-before-activate order, Buyer C pending delivery, and same-record retry to active.

Running `npm run build` while a dev server was still using `.next` caused one transient cache-only `MODULE_NOT_FOUND`; restarting the dev server resolved it and the final 25/25 run passed. This is not a product defect.

## Data state

Mutable JSON collections were backed up before testing and reset to deterministic seeds after every acceptance run. The final tracked JSON state matches the original top-level collections. One ignored local test upload remains at `uploads/concept-design-1-4c4b6a3be131.png`; its metadata was reset and it is not committed.

## Limitations and blockers

### Nhật / repository owner

- Obtain authenticated Git access and replay/cherry-pick `84741d0...` on real Git history before any push or PR.
- Reconcile the missing reported baseline commit and missing `m0-interface-freeze` tag.
- Triage the 63 dependency findings before release, especially the 9 high findings. The report shows 0 critical; several high issues are transitive through Hardhat/tooling, while PostCSS is reached through Next.js. Major-version upgrades need a separate compatibility review.

### Kat

- No functional Kat defect remains from this acceptance run.
- The service intentionally remains a single-process JSON mock without authentication, malware scanning, real KYC, publisher integration, or blockchain receipt authentication.

### Văn

- Implement and test the real receipt parser and proof capture; feed only validated, normalized receipts into `syncKatEntitlementEvent()`.
- Deploy the current contracts locally and publish deployment addresses. No `deployments/localhost.json` currently exists.
- Replace fixture receipt smoke data with real local-chain receipts and rerun the complete end-to-end evidence journey.
- Add frontend automation if required for final QA; the current integration includes build/type coverage, API automation, and manual render smoke testing.

Nothing was pushed, no PR was created, and `main` was not modified remotely.
