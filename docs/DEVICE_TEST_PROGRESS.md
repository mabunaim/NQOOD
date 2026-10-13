# Device test progress — 2026-10-13

Target: Mahmoud's iPhone 16 Pro Max, user-reported iOS 27. Evidence: user confirmations and screenshots in the project conversation. Financial screenshots are not copied into the public repository.

| Check | Evidence and status |
|---|---|
| SPK-T01 installation | B1 screenshot showed Home Screen/Standalone, B1 worker and 12/12 cached files. Passed for B1. |
| SPK-T02 save and totals | User confirmed the amount entered; screenshots show consistent saved values and totals using the user's existing test dataset. Passed for the adapted scenario. |
| SPK-T03 close/reopen persistence | User explicitly confirmed closing/reopening with records retained. Passed by user report. |
| SPK-T04 offline launch | User explicitly confirmed closing and reopening offline. Passed by user report. |
| SPK-T05 offline save/reopen | User explicitly confirmed new transactions saved offline and retained on offline reopen. Passed for the adapted scenario. |
| Non-zero third decimal | Original 5.125 test was not performed on the phone; 22.720 was entered instead, then other amounts. Three-decimal arithmetic has automated coverage; non-zero third-decimal device check remains pending. |
| SPK-T06 B2 update | Publishing B2 for same-origin update verification. Device result pending. |
| SPK-T07 reconnect/reopen | Pending following B2 update. |
| SPK-T08 controlled write failure | Passed in Chromium; device-specific gap remains recorded. |

B1.1 searchable-picker update was delivered and the user requested continuation after trying the app. No screenshot explicitly verifies the installed B1.1 build number. The next device check must identify B2 in diagnostics.

The dataset differs from the initial fixed 1000/20 test script. Use the latest screenshot in conversation as the before-update baseline; do not infer original-script execution from these adapted checks. Full UAT and the spike exit review remain open.

B2 changes the build marker and cache version; database schema and database name remain unchanged. Do not add transactions between the before/after update screenshots.
