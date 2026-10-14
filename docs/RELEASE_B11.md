# B11 — Backup and restore

More now includes Backup. JSON exports contain all months, exact integer fils, category activation states and record identities. Format: masareek/version 1/JOD. Files are handled locally; no upload service is involved.

Import validates the file before showing counts and export date. Replacement requires an explicit checkbox and button. It replaces all current categories and transactions; there is no merge. One pre-restore recovery snapshot is saved in IndexedDB in the same atomic transaction. A subsequent successful restore replaces that recovery snapshot. The snapshot can be exported from Backup and imported through the same preview flow. Export it to Files if it must survive browser data removal.

Malformed JSON, incompatible versions/currency, duplicate IDs/names, invalid amounts/dates and broken category references are rejected. Maximum import size: 20 MB. Canceled or failed restores leave existing data intact. Disabled linked categories are preserved. Restoring the same file again does not duplicate records.

## Validation
27 Node tests and 20 Chromium browser tests. Coverage includes exact roundtrip, structural rejection, rollback of data and recovery on injected write failure, downloaded JSON contents, canceled preview, offline replacement and persistence after reload. Historical upgrade, entry, summary and maintenance regression checks are included.

## Physical-device UAT — pending
1. More > Backup > Export; save the JSON to Files and confirm it exists.
2. Add one synthetic record; import the saved file. Check the preview counts. Cancel; the added record must remain.
3. Import again, acknowledge replacement and restore. The added record must disappear; original totals must return.
4. Export the pre-restore safety snapshot, import it, and verify the added record returns.
5. Repeat import offline. Restart and verify totals persist.
6. Select a malformed JSON file. Existing records and totals must remain unchanged.

iOS system file-picker and download behavior still require device confirmation. This is a test release, not final production sign-off.
