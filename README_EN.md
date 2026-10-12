# Masareek — SPK-001 v0.1
Technical spike, 2026-10-12. This is runnable source and two static PWA builds, not a production release.

## Run
Node.js >=20:
```sh
npm ci
npm run build
npm test
npx playwright install chromium
npm run test:browser
npm run serve
```
Desktop URL: http://localhost:4173. Physical-device PWA testing requires HTTPS.
BROWSER_PATH can select an existing Chromium executable; BROWSER_ARGS is an optional JSON array used by the test configuration.

## Architecture
Vanilla ES modules; Arabic RTL UI; English digits; native IndexedDB; service worker and static manifest. No production runtime dependencies or remote financial API. Money is validated as integer fils, with BigInt aggregate totals. Save success is reported only after transaction completion. Form IDs prevent retry/double-submit duplication without blocking intentional repeated purchases.

Build artifacts: dist-b1 and dist-b2. Deploy one directory's contents to a stable HTTPS path; replace B1 with B2 at that same path to test updates. A scope-specific cache and a path-specific database support a GitHub project subdirectory. Updating caches does not delete IndexedDB. Both builds use schema version 1.

The T08 fixture uses the same application/repository flow and an isolated database. It aborts a write transaction after the add request succeeds, before commit; the normal database cannot arm this hook. No quota-filling failure injection.

## Verification and boundaries
18 Node tests passed (DB tests use fake-indexeddb); 6 Chromium browser tests passed (native browser IndexedDB/service worker).
No physical iPhone, Safari, full browser-process restart, production migration, or full UAT pass is claimed.
See docs/TEST_EXECUTION.md and README_AR.md. Backup, category lifecycle, record maintenance and category reports remain product backlog items.

