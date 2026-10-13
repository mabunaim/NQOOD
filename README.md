# مصاريك — NQOOD

Personal expense PWA · SPK-001 technical spike · B1.1

Repository: https://github.com/mabunaim/NQOOD

This is the first technical verification build, not the complete product. Use fictional test data until physical iPhone verification and backup implementation are complete.

## GitHub Pages setup

In this repository: **Settings → Pages → Build and deployment → Source: Deploy from a branch → Branch: main → Folder: /docs → Save**.

Expected URL after GitHub successfully deploys: https://mabunaim.github.io/NQOOD/
The URL is not considered live until the Pages deployment succeeds.

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

To refresh the B1.1 files in the Pages publishing folder:

```sh
node tools/stage-pages.mjs B1.1
```

Only when the B1 device tests reach SPK-T06, stage B2 and commit the changed docs files:

```sh
node tools/stage-pages.mjs B2
```

Keep the same Pages URL and device storage for the B1→B2 test. Do not launch dist-b2 as a separate site; that would use a different scoped database.

## Guides and evidence

- [Arabic start guide](README_AR.md)
- [English technical guide](README_EN.md)
- [Test execution and pending iPhone tests](docs/TEST_EXECUTION.md)
- [Decisions and next steps](docs/DECISIONS_AND_NEXT_STEPS.md)

18 Node tests and 6 Chromium tests passed locally. Physical iPhone/Safari tests and UAT are pending. Categories can be created; disabling/reactivating categories, record maintenance, reports and backup/restore remain in the full-product backlog.

The October 12 packaged guides retain their pre-upload status. This repository now contains the source and B1 deployment files; enabling Pages and verifying the live deployment are the next steps. No financial transactions or account credentials are included.

## B1.1 — 2026-10-13
Searchable category sheet approved by Mahmoud. 8 Chromium browser tests passed, including B1 → B1.1 preservation. See [release note](docs/RELEASE_B1_1.md). The original B1 files remain in dist-b1 for update regression testing.
