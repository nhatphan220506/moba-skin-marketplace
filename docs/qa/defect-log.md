# Defect log

As of 2026-09-13, open Blocker: **0**, High: **0**, Medium: **0**, Low: **0**.

| ID | Severity | Status | Summary | Closure evidence |
|---|---|---|---|---|
| DEF-002 | Blocker | RESOLVED | Entitlement activate, revoke, pending delivery and retry were unavailable in the earlier combined tree. | Integrated Kat endpoints pass 25/25 checks. Journey Step 17 makes Buyer B `ACTIVE`; Step 22 makes Buyer B `REVOKED`, Buyer C `DELIVERY_PENDING`, then updates the same activation to `ACTIVE`. Replaying both confirmed transaction events returns the same activation IDs. |

Dependency audit findings and synthetic-history provenance are tracked as release limitations, not application defects. They require maintenance/replay before public release but do not invalidate the deterministic local prototype.
