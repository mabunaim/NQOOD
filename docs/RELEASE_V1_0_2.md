# V1.0.2 — Today and month-specific deletion

Home shows today's local device date in DD/MM/YYYY with English digits, separately from the selected reporting month. It refreshes when Home renders and every minute while Home remains visible.

The all-data reset has been removed and replaced by Delete month. The selector only includes months containing transactions. The preview shows the selected year/month, record count, and expense/income totals before explicit confirmation. Deletion atomically removes transactions for that month only. Categories, other months and recovery snapshots remain unchanged; exported backup files are not affected. An empty database disables confirmation. Updates do not automatically delete any data.

Validation: 28 Node tests and 22 browser tests cover rollback, invalid month rejection, month isolation, category preservation, empty state, cancel, offline persistence and upgrade preserving stored data.
