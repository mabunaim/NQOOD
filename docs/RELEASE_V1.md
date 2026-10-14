# Masareek V1.0.0

First personal-use release, promoted from B12 after acceptance of core entry, editing, deletion, numeric accuracy, summaries, backup and restore.

## Included
- Income and expenses with mandatory category, optional description and calendar date.
- Exact three-decimal JOD amounts, English digits and monthly isolation without balance carryover.
- Category maintenance, deactivation/reactivation and preserved linked history.
- Separate expense/income summaries with category drilldown.
- Offline storage, controlled application updates, backup export and validated atomic restore with a local recovery snapshot.

## Release changes
Replace experimental labels with V1.0.0. Rename diagnostic navigation to About and Updates, hide the internal test link, and update the installable app name. Existing storage identity, URL and data schema are unchanged; no data reset or automatic cleanup occurs.

## Operational notes
Data is local to this device and browser. Export a backup to Files regularly and before removing browser data or changing devices. Restore replaces current data after explicit confirmation. No login, cloud synchronization, budgets or automatic bank import is included. Previously entered test records remain until individually deleted by the user.

## Verification
21 Chromium browser tests passed for the release, including B12-to-V1.0.0 update retaining records and offline restart. No financial calculation or database schema changes were introduced. The 27 domain/storage tests passed on B11, and those modules are unchanged.
