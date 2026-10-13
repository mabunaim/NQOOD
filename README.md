# مصاريك — NQOOD

Personal expense PWA. Current build: **B3 — Category maintenance**.

Application: https://mabunaim.github.io/NQOOD/

This is an incremental test build, not the complete product. Use fictional test data while backup/restore and full acceptance testing remain pending.

## Development

Node.js 20 or newer:

```sh
npm ci
npm run build
npm test
npx playwright install chromium
npm run test:browser
npm run serve
```

## Deployment

GitHub Pages publishes from **main /docs**. To stage the current build:

```sh
node tools/stage-pages.mjs B3
```

Keep the same URL and database name when deploying updates. Historical builds remain available for update regression testing.

## Current scope

Income and expense entry, monthly totals, searchable categories, category creation and maintenance, offline storage and controlled updates. Category maintenance preserves linked records when renaming, disabling or reactivating a category. Used categories cannot be deleted.

20 Node tests and 10 Chromium browser tests passed. Physical-device category UAT is pending. Record editing, reports and backup/restore are still pending.

- [B3 release notes and UAT cases](docs/RELEASE_B3.md)
- [B1.1 release notes](docs/RELEASE_B1_1.md)
- [Original Arabic guide](README_AR.md)
- [Original English guide](README_EN.md)

Older guides describe the initial technical spike and may reference historical builds.
