# B6 — In-form category selection

Expense and income entry now shows the first four active categories in alphabetical order as direct buttons. With more than four categories, All Categories expands a compact searchable list directly inside the form. The list has a bounded height and internal scrolling. Selecting a result collapses the list and displays the selected name, including selections outside the first four. The amount and description remain unchanged while selecting. Category creation remains in Definitions only.

## Verification and UAT

Chromium coverage includes quick selection, alphabetical order, type separation, disabled categories, search beyond the first four, retained form inputs, B5-to-B6 update preservation, offline persistence and session reset. A first-install service-worker reload can interrupt the diagnostic-page test, so its readiness helper retries opening diagnostics until readiness is observed.

Device UAT: check direct selection with up to four categories, search with five or more, selected-state visibility, and keyboard/scroll behavior on iPhone. Confirm saved amounts and existing records remain unchanged.

Database schema and financial calculations are unchanged.
