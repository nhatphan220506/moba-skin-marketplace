# Private GitHub publication and team handoff

## Publish the prepared repository

Create an empty **private** GitHub repository named `moba-skin-marketplace`. Do not initialise it with a README, licence or `.gitignore`, because all three already exist locally.

From the extracted project folder:

```bash
git remote add origin https://github.com/YOUR_ACCOUNT/moba-skin-marketplace.git
git push -u origin main
git push origin feature/nhat-core
git push origin feature/kat-offchain
git push origin feature/van-testing
git push origin m0-interface-freeze
```

Confirm on GitHub that:

- repository visibility is Private;
- default branch is `main`;
- all three feature branches exist;
- the `m0-interface-freeze` tag points to the same baseline as `main`;
- no `.env`, private key, `node_modules` or build output appears.

## Invite the team

Invite Kat and Văn as repository collaborators. Send each person:

1. Private repository URL.
2. Their branch name.
3. Baseline tag: `m0-interface-freeze`.
4. `docs/masterplan/Masterplan_Final.docx`.
5. Their personal handover DOCX under `docs/handover/`.
6. `docs/interfaces.md`.
7. Their specific API or evidence contract.
8. The command below.

```bash
npm install
npm run check:m0
```

## Kat starts

```bash
git checkout feature/kat-offchain
```

Kat owns `app/api`, `lib/server`, `lib/mock-game`, `data` and `docs/api`.

## Văn starts

```bash
git checkout feature/van-testing
```

Văn owns `test`, `scripts/demo`, `lib/evidence`, `components/technical` and `docs/qa`.

## Nhật continues

```bash
git checkout feature/nhat-core
```

Nhật implements contracts and blockchain integration. Nhật merges approved pull requests into `main` and completes final UI/UX only after the functional flow is integrated.

## Recommended branch protection

Protect `main` with:

- pull request required before merge;
- status checks required when GitHub Actions is available;
- force pushes disabled;
- branch deletion disabled.

Do not protect the three feature branches so each owner can push their own work normally.

## Handoff confirmation message

```text
Repository: <private URL>
Baseline: m0-interface-freeze
Your branch: <assigned branch>
Your task file: <personal DOCX>
Read first: Masterplan -> personal task file -> docs/interfaces.md
Run first: npm install && npm run check:m0
Do not edit: shared types/config/contract signatures without a change request
Report output with: branch + commit hash + run instructions + known limitations
```
