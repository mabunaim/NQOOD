# B12 — Summary layout

The monthly totals remain above the category breakdown. Expense and income breakdowns now use separate toggle buttons rather than placing income below the expense list. The switcher stays at the top of the scroll area while browsing long lists. Switching resets the content scroll to the top. Category details return to the previously selected type. Each panel shows its category count and percentage basis. The existing calculations and stored data are unchanged.

Validation: 21 Chromium browser tests passed, including 200 expense categories with immediate access to income, hidden inactive panel, drilldown/back state and 320px overflow check. The 27 domain/storage tests passed on B11; those modules are unchanged. Screenshot review covered both summary panels at 390px.

Device UAT: switch expense/income, scroll a long list, open a category and return, change month, verify totals and empty states. Confirm the switcher remains reachable on iPhone.
