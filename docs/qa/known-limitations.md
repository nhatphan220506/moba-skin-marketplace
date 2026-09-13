# Known limitations

- The local Git graph is a verified synthetic import of remote trees because terminal GitHub credentials were unavailable. Do not push it. Replay the integration commits onto an authenticated clone based on remote `main@4b9d550bcc9789c96e96bb3a31fb87e7985fcaad`.
- `npm ci` reports 63 dependency audit findings: 14 low, 40 moderate, 9 high, and 0 critical. No forceful or unrelated upgrade was applied. Review upgrades in a separate compatibility task.
- Kat storage is deterministic local JSON. It has no production database, authentication, malware scanner, KYC, real AI ownership decision, or real Riot/Garena delivery.
- Hardhat accounts and transaction hashes are local demo evidence only. Never reuse the public development keys on a public network.
- The frontend now includes a presentation-grade visual system, guided stakeholder checkpoints, automatic regression mode, evidence filters and JSON export. Guided checkpoints replay a fresh deterministic chain through the selected step rather than maintaining a public persistent chain between actions.
- Browser-wallet injection and public-testnet explorer links remain optional future work. The current role selector uses disclosed Hardhat demo actors only.
- Next.js development mode warns that explicit `allowedDevOrigins` will be required by a future major version when loading assets through `127.0.0.1`; the current build and smoke test are unaffected.
- The TypeScript evidence acceptance runner emits a harmless Node module-type performance warning. Parsing behavior passes.
