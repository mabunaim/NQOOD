# B9 — Entry space and deliberate swipes

The bottom navigation is hidden throughout expense/income creation and editing, including while the keyboard is open. It returns on Home after saving or closing. Close still offers save/discard/continue for unsaved values. Definitions and other main pages retain bottom navigation.

Swipe actions now require at least 80 CSS pixels of horizontal travel (previously 40), with horizontal movement more than twice vertical movement. Direction capture begins after 24px rather than 12px. Short/diagonal movements do not reveal actions. The ellipsis remains an alternative; deletion still requires confirmation.

Verification: browser coverage includes create/edit navigation, short viewport, restoration after save/discard, short/diagonal rejection, deliberate swipes, emulated touch, offline maintenance and B8-to-B9 upgrade. Physical iPhone gesture feel remains a UAT check. Storage schema and financial logic are unchanged.
