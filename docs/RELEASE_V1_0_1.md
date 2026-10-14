# V1.0.1 — Clear all local data

More now offers Clear all data with an explicit confirmation dialog. On confirmation, all categories, transactions and local pre-restore recovery metadata in the current app database are cleared atomically. The schema marker is retained and the app returns to an empty Home ready for new data. Exported files in the operating system's Files app are outside this operation and are not removed.

Updating alone never deletes data. Cancellation leaves all data intact. An injected failure rolls back all stores, including recovery data. Backgrounding dismisses the confirmation unless a submitted write is completing. The operation does not remove the installed PWA or offline assets.

Validation: 28 Node tests and 22 Chromium browser tests, including confirmed reset, cancellation, rollback, recovery removal, offline reload and successful new entries after reset. Upgrade from V1.0.0 preserves data until the user explicitly invokes reset.
