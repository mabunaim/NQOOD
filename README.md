# مصاريك — NQOOD

Personal expense PWA. Current build: **B11 — Backup and restore**.

Application: https://mabunaim.github.io/NQOOD/

This is an incremental test build, not the complete product. Use fictional test data until physical-device backup/restore and full acceptance testing are complete.

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
node tools/stage-pages.mjs B11
```

Keep the same URL and database name when deploying updates. Historical builds remain available for update regression testing.

## Current scope

Income and expense entry, monthly totals, searchable categories, category creation and maintenance, offline storage and controlled updates. Category maintenance preserves linked records when renaming, disabling or reactivating a category. Used categories cannot be deleted.

27 Node tests and 20 Chromium browser tests passed. Physical-device category UAT is pending. Record editing and confirmed deletion are available. Monthly category reports are available. Validated JSON export and atomic replacement restore are available, with a local pre-restore recovery snapshot. iPhone Files export/import UAT is pending.

- [B11 backup and restore](docs/RELEASE_B11.md)
- [B10 summary, navigation and calendar](docs/RELEASE_B10.md)
- [B9 entry layout and swipe adjustment](docs/RELEASE_B9.md)
- [B8 transaction maintenance and UAT](docs/RELEASE_B8.md)
- [B7 native dropdown](docs/RELEASE_B7.md)
- [B6 category selection](docs/RELEASE_B6.md)
- [B5 entry and session behavior](docs/RELEASE_B5.md)
- [B4 layout release notes and UAT](docs/RELEASE_B4.md)
- [B3 release notes and UAT cases](docs/RELEASE_B3.md)
- [B1.1 release notes](docs/RELEASE_B1_1.md)
- [Original Arabic guide](README_AR.md)
- [Original English guide](README_EN.md)

Older guides describe the initial technical spike and may reference historical builds.
