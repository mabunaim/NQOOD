# B4 — Fixed mobile layout

The application fits the visible viewport. Main navigation stays at the bottom, and long content scrolls inside the content panel. Navigation is also available in entry and category editing, with the existing unsaved-change guard. The category creation form, category editor and selection sheet use tighter spacing while keeping touch targets at least 44px tall. The layout follows the visual viewport when the keyboard opens, without disabling pinch zoom.

## Verification

11 Chromium scenarios cover the existing data flows, update preservation and a new layout case with 30 synthetic records, a 320px-wide viewport, compact category creation, short viewport and guarded navigation. Mobile-keyboard behavior still requires physical iPhone UAT; viewport simulation is not an iOS keyboard test.

## UAT — pending

- Scroll a long home history: bottom navigation remains visible and stationary.
- Open Definitions: category creation occupies a compact card.
- Open and dismiss the iPhone keyboard: fields and save controls remain reachable by scrolling; the screen returns to full height.
- Move between screens with an unsaved entry: save/discard/continue prompt remains available.
- Confirm existing records and totals remain unchanged after update.

Database schema and financial calculations are unchanged. Backup/restore and the remaining product features are still pending.
