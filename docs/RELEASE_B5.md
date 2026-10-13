# B5 — Simpler entry and fresh sessions

Category creation is available only in Definitions. Expense and income forms offer category search and selection, without inline creation. This supersedes the earlier inline-category creation behavior.

Leaving the app ends an unsaved editing session. Background/foreground and page restoration handling returns to Home, closes dialogs and clears unsaved expense, income and category forms. A cold launch also opens Home. Saved records remain intact. Navigating within the app still offers save/discard/continue for unsaved changes.

A browser cannot reliably distinguish closing the app from switching to another app: both intentionally discard the draft. No before-unload draft prompt is used. A save already submitted is allowed to finish atomically; this feature does not undo a committed save.

## Verification

12 Chromium browser tests passed, including B4-to-B5 update preservation, definitions-only creation, simulated background/restoration lifecycle events, reload with unsaved category edits, offline data persistence and fixed layout. Real iPhone lifecycle handling remains a device UAT item.

## UAT — pending

1. Verify no category-create action appears in expense/income entry or category selection.
2. Enter an expense without saving, leave the app, then reopen: Home opens; no record was added.
3. Repeat with income and new/edited category forms: unsaved changes disappear.
4. Save a record, close and reopen: the saved record and totals persist.
5. Navigate inside the app with a draft: the save/discard/continue prompt remains.

The database schema and money calculations are unchanged.
