# SPK-001 — Test Execution Report
Date: 2026-10-12 · Build B1/B2 · Schema 1 · Status: desktop evidence complete; target-device gate pending.

## Executed evidence
| Layer | Environment | Result |
|---|---|---|
| Domain / repository | Node.js 24.19.0; fake-indexeddb for DB API tests | 18 passed, 0 failed |
| Browser | Linux, Chromium 153; Playwright; native IndexedDB and service worker | 6 passed, 0 failed |
| Visual review | Chromium viewport 430 × 932; narrow-layout assertion at width 320 | Reviewed; no horizontal overflow in narrow test |
| Target device | User-reported iPhone 16 Pro Max / iOS 27 | Not Run |
| Full UAT | Mahmoud acceptance | Not Run |

Browser machine-readable results: browser-results.json.
Execution used an available standalone Chromium binary through BROWSER_PATH after the standard browser download failed. No browser security-disabling flags were used; the container launch used no-sandbox, disable-dev-shm-usage and disable-gpu.

## Browser coverage
1. Income 1000 minus expense 20 gives 980; page close/reopen persistence; offline reopen and save 5.125 gives 974.875; 3 records.
2. English-digit normalization and three exit choices; invalid Save & Leave retains values; discard does not save; unchanged close does not prompt. Supporting evidence for TC-ENT-007–010.
3. T08 actual transaction abort: direct DB inspection confirms 0 records after failure; values retained; retry saves exactly 1; reload persists it; main DB unaffected.
4. B1→B2 update: dirty-entry guard retains input; saved entries survive activation; totals survive offline reload.
5. Project subpath /demo/: precache, save, offline reload.
6. Inline category preserves amount/description; duplicate trimmed name rejected; optional-description completion state; 320px layout.

Unit coverage includes amount precision/bounds, Arabic/Persian digit conversion, monthly separation, large aggregate totals, dates/leap years, category validation, atomic rollback, retry IDs, intentional repeats, database isolation and blocked production failure hook.

These are page close/reopen tests within a browser context, not proof of persistence through a full OS/browser-process restart. Chromium evidence does not substitute for iPhone/Safari results.

## Target-device execution sheet
Use fictional data, normal browsing, same origin and Home Screen installation. Record device-reported OS version when executing. T01–T07 must run sequentially.

| ID | Procedure | Expected | Actual / evidence | Status |
|---|---|---|---|---|
| SPK-T01 | Open B1 HTTPS online; add to Home Screen; launch; inspect readiness | Standalone opens; Arabic RTL; English digits; cached readiness verified | — | Not Run |
| SPK-T02 | Create البيت expense and راتب income; save 1000 income and 20 expense in current month | 2 categories, 2 records; income 1000; expense 20; remaining 980 | — | Not Run |
| SPK-T03 | Fully close and reopen app | Same categories/records; remaining 980 | — | Not Run |
| SPK-T04 | Disable Wi-Fi and mobile data; close and launch from icon | Offline shell and data; remaining 980 | — | Not Run |
| SPK-T05 | Offline save expense 5.125; close and reopen offline | 3 records; expense 25.125; remaining 974.875 | — | Not Run |
| SPK-T06 | Restore internet; deploy B2 at same URL; activate update without clearing storage; launch offline again | Identifiable B2; 2 categories and 3 records retained; remaining 974.875 | — | Not Run |
| SPK-T07 | Reconnect and reopen once more | No duplicates/loss; same totals | — | Not Run |
| SPK-T08 | Separate fixture; arm one write abort; save; retry | Error retains values and adds nothing; retry adds exactly one | Automated Chromium test passed; iPhone injection not run | Passed — controlled environment |

Record for each run: tester, date/time, build, URL, device/OS, expected/actual, screenshot or note, defect ID where needed.
Exit gate: target T01–T07 pass; controlled T08 evidence and device gaps reviewed by Mahmoud. Gate currently OPEN.

## Known limitations / outstanding validation
- Physical iPhone keyboard, installation, storage lifecycle and update behavior remain unverified.
- Multiple-tab update safety exists in code but is not covered by this browser suite.
- beforeunload is best effort; OS termination cannot be guaranteed to show an unsaved-data prompt.
- Backup/restore and schema migration are unimplemented.
- There are no failures in the executed tests; this does not establish absence of defects outside their coverage.

