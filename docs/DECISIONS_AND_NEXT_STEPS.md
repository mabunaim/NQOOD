# Decisions and next steps
2026-10-12 · Addendum to the approved BRD and SPK-001 brief.

## Confirmed decisions
- Mahmoud authorized implementation here; Claude has not started. References assigning implementation to Claude in older documents are superseded for this work.
- Mahmoud allowed more time; the earlier 1–2 hour availability is not a fixed daily ceiling. No new delivery date is committed.
- Public GitHub code repository is approved in principle. Account connection, repository identity and publication remain pending; no repository has been created or deployment claimed.
- The approved business scope remains unchanged. This delivery implements the technical spike only.

## Current delivery
B1/B2 PWA, local database, income/expense entry, minimum category creation, leave guard, controlled failure fixture, automated tests and execution sheet.
Developer verification passed. The physical iPhone exit gate and full UAT have not passed.

## Next sequence
1. Connect GitHub, confirm account/repository, publish B1 to a stable HTTPS URL.
2. Mahmoud executes SPK-T01–T05; record results. Publish B2 to same URL and execute T06–T07.
3. Review failures and controlled T08 evidence; agree spike exit decision.
4. Refine product backlog/estimates and requirement-to-test traceability.
5. Implement full category lifecycle (disable/reactivate same ID; historical records retained), record editing/deletion with month-change prohibition, reports and backup/restore.
6. Execute full functional/regression test cases and UAT before real daily use.

## Mahmoud's PM exercise
For the first device session, complete:
- Objective: demonstrate saving and reopening data on the target phone.
- Evidence: actual result for each test, not just “looks good”.
- Defect: steps, expected/actual, severity and screenshot where relevant.
- Decision: pass gate, fix and retest, or record a specifically accepted residual risk.

Approval of appearance is separate from acceptance of functionality. A code build is a deliverable; a passed acceptance gate requires executed evidence.

