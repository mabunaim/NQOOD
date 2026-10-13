# B7 — Native category dropdown

Replaces B6 quick buttons and inline search with a native HTML select, matching the original category selection interaction. The list contains active categories of the selected transaction type, sorted alphabetically. No category is selected automatically. Category creation remains in Definitions only.

The fixed navigation layout and session-discard behavior remain unchanged. Existing data and the database schema are unchanged.

## UAT

- Expense/income category selection uses the native dropdown.
- Disabled categories cannot be selected for new entries.
- Category selection preserves the amount and description.
- Closing/backgrounding a draft still returns to Home without saving it.
- Existing records and totals persist through the update.

Native popup appearance is controlled by the device/browser. Physical iPhone verification remains required.
