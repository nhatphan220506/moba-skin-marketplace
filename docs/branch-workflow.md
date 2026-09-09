# Branch and handoff workflow

## Baseline

All contributors start from the commit tagged `m0-interface-freeze`.

## Assigned branches

- Nhật: `feature/nhat-core`
- Kat: `feature/kat-offchain`
- Văn: `feature/van-testing`

Each person works only in their assigned branch and owned folders. Pull the latest `main` before final handoff, resolve only conflicts inside owned files, and do not rewrite another contributor's history.

## Commit handoff

A handoff message contains:

```text
Branch:
Commit hash:
Output completed:
How to run:
Input consumed:
Known limitations:
Tests/evidence:
Shared change requested, if any:
```

Do not send repository source files separately through chat. Binary documents may be sent as supporting references, but the authoritative code output is the branch commit or pull request.

## Pull request order

1. Kat opens a pull request when APIs and mock game adapter have reproducible examples.
2. Văn opens a pull request when tests/evidence modules target the current interfaces.
3. Nhật integrates each branch, returns interface feedback, and fixes shared/contract issues.
4. Văn reruns regression and publishes the release recommendation.
5. Nhật completes final UI/UX and freezes the release tag.

## Conflict prevention

- Kat and Văn never edit the same folders.
- Only Nhật edits `types/`, `config/`, contract public signatures and app-wide styles.
- Functional technical components from Văn accept data props and avoid global CSS.
- API handlers from Kat use shared types and do not import UI modules.
