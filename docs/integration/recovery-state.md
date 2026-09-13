# Recovery state

Recovered on 2026-09-13 in the isolated local worktree at
`work/kat-integration/repo`.

## Repository and provenance

- Expected remote: `https://github.com/nhatphan220506/moba-skin-marketplace.git`.
- Canonical continuation branch: `integration/kat-offchain`.
- Current local integration tip at recovery: `84741d06554eab19a914cbaea4199b218704bdf0`.
- Synthetic local baseline commit: `50397798b35058adf72f763fabdf836101c5ce39`, containing the tree reported as remote `main@4b9d550bcc9789c96e96bb3a31fb87e7985fcaad`.
- Synthetic local Kat commit: `57828c04aa05d5b8e4edae6fc3305718a3227c47`, containing the tree reported as remote `feature/kat-offchain@1d3cb97b79db511084d487cfc3a5b70dfe65f12c`.
- Kat merge commit: `160dd4a90f47832edbd725024a61550cf9d5b99b`.
- Kat integration/UI adapter commit: `84741d06554eab19a914cbaea4199b218704bdf0`.

The local graph is synthetic because terminal GitHub credentials were unavailable to the interrupted agent. A fetch was retried during recovery and failed at authentication, so this history must not be pushed as a substitute for the authenticated remote graph.

## Worktrees, branches, and dirty state

- The recovered repository has one worktree on `integration/kat-offchain`.
- Local branches: `main`, `feature/kat-offchain`, and `integration/kat-offchain`.
- No stash was present.
- Two task-owned, untracked documents were recovered: `docs/handover/van-integration-input.md` and `docs/integration/kat-integration-report.md`.
- No unrelated user edits were present in this isolated worktree.
- A Next.js process from the interrupted integration run was listening on port 3000 with this repository as its working directory. It was left intact until runtime verification required a controlled restart.

## Văn recovery

The authenticated browser session exposed remote `feature/van-testing` at
`4bc00fee54b070d0163fd207d1c069ebcb7cfe7c`. Its ZIP archive was downloaded and inspected without changing the remote. The published branch contains only the earlier checkpoint (including `docs/qa/baseline-audit.md`) and does not contain the reported local-only parser, normalizer, history loader, evidence component, demo scripts, full test set, QA workbook, or journey evidence.

No recoverable copy of those local-only files was found in local worktrees, branches, reflogs, stashes, or the user filesystem. The missing Văn output will therefore be rebuilt against the integrated contracts and Kat boundary, and that fact will be recorded in the final integration report.

## Continuation decision

Continue on the existing `integration/kat-offchain` branch because it contains verified Kat integration work and preserves the latest inspected Nhật contract baseline. Add Văn reconstruction, the real 22-step journey, frontend wiring, and final verification there. No remote push, pull request, or merge to `main` is authorized.
