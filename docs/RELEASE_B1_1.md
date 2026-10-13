# B1.1 — Category selection with search

2026-10-13. Requested and approved by Mahmoud on 2026-10-12.

- Replaces the native category dropdown with a bottom sheet, search and scrollable one-tap choices.
- Category remains mandatory. Only active categories matching income/expense are offered.
- Closing or cancelling retains the selected category, amount and description. Search text is temporary.
- Shows selected state, empty results and a route to create a category.
- The update flow waits while the picker is open. IndexedDB name and schema stay unchanged.

Validation: 8 Chromium browser tests passed on 2026-10-13, including 36-category filtering, no-match/cancel behavior, income separation, offline save, controlled failure and B1 → B1.1 update preserving records. Narrow layout and existing entry guards were also covered. No iPhone keyboard/VoiceOver pass is claimed.

The iPhone B1 screenshot supplied on 2026-10-12 confirmed standalone launch and 12/12 cached assets (SPK-T01). Other physical-device cases remain pending; one existing transaction was observed but its amount/type has not yet been confirmed. Recheck T01 on B1.1 and continue the device sequence using confirmed actual data. This UI change does not constitute full UAT acceptance.

Deployment: main/docs at the existing /NQOOD/ URL. Use the in-app update command without deleting the app or site data. B2 is still reserved for the later update test, and is not the deployed version.
