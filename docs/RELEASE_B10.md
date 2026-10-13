# B10 — Monthly summary, More navigation and date picker

Main navigation has three tabs: Home, Summary, More. Home remains the launch screen. Definitions is reached through More → Definitions → Categories, and Diagnostics through More. Entry forms continue hiding bottom navigation.

Summary opens on the current month and offers the last twelve months plus all months with stored records. It displays income, expenses and remaining balance, and descending expense categories with proportional horizontal bars. Amount aggregation uses integer fils/BigInt; percentages round to one decimal. Category details list only the selected category/type/month. Income sources are collapsible. Disabled categories remain included in totals. No budget targets or carryover are introduced. Empty months show zero totals and explicit empty states.

Daily history headers now have a slightly darker background, 600-weight text, and a 13px font for clearer date and daily totals in light/dark themes.

Transaction date uses the native date input with the current day as default and maximum. Tapping invokes the supported browser/device picker. Editing restricts its minimum/maximum to the original month, while repository validation still prevents cross-month moves. Stored dates remain ISO strings, independent of browser display format. Existing data needs no migration.

## Verification

24 Node tests and 19 Chromium scenarios passed, covering summary reconciliation, disabled groups, month/type separation, category drilldown, More navigation, offline summary/reopen, date picker type/default/bounds, leap-day entry, and B9-to-B10 preservation. Existing edit/delete, swipe, draft-discard and entry-navigation tests remain passing. Summary and daily-header layouts were visually reviewed using synthetic data.

## Device UAT

- Verify the daily date/total band is readable.
- Navigate More → Definitions → Categories and back.
- Compare Summary totals to Home for the same month, including disabled categories.
- Open a category for its transactions; expand income sources.
- Choose a previous month and check isolation.
- Tap the date field on iPhone and choose from the native picker. Confirm saved date and month.
- Confirm editing cannot move a record outside its original month.

Native picker appearance is controlled by iOS/browser; physical-device UAT remains pending. Backup/restore is still pending.
