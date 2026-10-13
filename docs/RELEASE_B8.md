# B8 — Searchable categories and transaction maintenance

## Category selection

A compact editable combobox opens a popup directly below the field. Up to four normal-height rows are visible; longer lists scroll internally. Typing filters existing active categories. Selecting an option commits the category ID; free text never creates a category. Escape/outside click closes the popup and restores the selected label. Arrow keys and Enter support keyboard navigation. The chosen transaction type controls available categories. The existing disabled category remains available when editing its linked record.

Design reference: W3C APG Combobox Pattern — https://www.w3.org/WAI/ARIA/apg/patterns/combobox/

## Transaction maintenance

Swipe a record left or right to reveal Edit and Delete. The visible ellipsis provides the same actions without a gesture. Vertical movement remains scrolling; swiping never deletes directly. Only one action row is open at a time.

Editing reuses the transaction form, preserves record ID and creation timestamp, supports amount/category/description/date changes, and forbids type changes or moving the record to another month. Existing disabled category links can be retained, while a different disabled category cannot be selected. Saving updates the daily and monthly totals without creating another record.

Deletion requires a confirmation displaying category, amount, date and description. Cancel leaves the record unchanged. Successful deletion updates totals. Writes resolve only after database transaction commit; failures preserve previous stored data. Submitted operations are atomic, including offline. Session reset and unsaved-change navigation rules continue to apply.

## Verification

23 Node tests and 15 Chromium browser tests passed. Coverage includes update/delete rollback, preserved identity, month/type restrictions, disabled categories, search among 20 categories, keyboard selection, left/right drag, emulated touch swipe, vertical-drag rejection, offline edit/delete/reopen, delete cancellation, income totals, draft discard and B7-to-B8 update preservation. UI screenshots were reviewed locally with synthetic data. Physical iPhone swipe/keyboard UAT remains pending.

## UAT cases

| ID | Action | Expected |
| --- | --- | --- |
| PICK-01 | Open a list of 20 categories | Compact anchored popup, internal scrolling |
| PICK-02 | Type part of a category name and select | Correct category selected; amount and description retained |
| TX-01 | Swipe a record in either direction | Edit/Delete revealed, no deletion yet |
| TX-02 | Scroll history vertically | Scrolling, no accidental action reveal |
| TX-03 | Change amount and save | One existing record updated; daily/monthly totals correct |
| TX-04 | Change date to another month | Save rejected with explanation |
| TX-05 | Edit a record linked to a disabled category | Existing category can be retained |
| TX-06 | Delete, then cancel | Record and totals unchanged |
| TX-07 | Confirm deletion offline, close and reopen | Deletion persists; correct totals |
| TX-08 | Leave an unsaved edit using navigation | Save/discard/continue prompt |
| TX-09 | Background an unsaved edit and return | Home shown; stored record unchanged |

Database schema remains version 1. Reports and backup/restore are not included in this release.
