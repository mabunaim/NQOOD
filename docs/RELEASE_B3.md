# B3 — Category maintenance

Definitions now supports renaming, disabling and reactivating expense and income categories. Category IDs and linked transactions are preserved. Renaming updates historical labels. Disabled categories remain visible in Definitions and history, and are excluded from new-entry choices. Category type cannot change. Used categories cannot be deleted; unused categories require deletion confirmation. Unsaved edits offer save, discard or continue editing.

Database version remains 1. The deployment keeps the existing URL and database name.

## Automated verification

20 Node tests and 10 Chromium browser tests passed. Coverage includes category identity, linked-history preservation, duplicate validation, protected deletion, offline reactivation, unsaved edits, and B1/B2-to-B3 updates retaining records. These results do not replace physical-device UAT.

## UAT — pending

| ID | Action | Expected result |
| --- | --- | --- |
| CAT-01 | Rename a used category | New name appears in history; amounts and record count stay unchanged |
| CAT-02 | Disable a used category | Existing records remain; category disappears from new-entry choices |
| CAT-03 | Reactivate the same category | Category returns to choices with its existing records retained |
| CAT-04 | Leave a changed name without saving | Save, discard and continue options work correctly |
| CAT-05 | Try a duplicate name within the same type | Validation prevents saving |
| CAT-06 | Inspect a used category | Delete is unavailable |
| CAT-07 | Delete an unused test category | Cancel retains it; confirmation deletes it |
| CAT-08 | Reactivate offline, wait for success, close and reopen | Active status persists |

## Delivery boundary

Record editing, reports and backup/restore remain pending. Continue using fictional test data until backup/restore is available and the full acceptance process is complete.
