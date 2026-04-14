## Remove "View all spots" collapse in SpotList

**File**: `src/components/producer/SpotList.tsx` — display logic only

Currently, sections with more than 6 slots show a collapsed summary ("X spots available" + "View all spots" link) requiring an extra tap. This removes that intermediate state so expanding the mobile card immediately shows all spots.

### Change

Remove the `shouldCollapse` / `isExpanded` gating (lines 241-269) and the "Collapse" button (lines 323-332). Every section will always render the full spot list directly.

Specifically:

- Delete the `shouldCollapse` and `isExpanded` variables (lines 241-242)
- Delete the collapsed summary block (lines 245-269)
- Delete the "Collapse" button block (lines 323-332)

No changes to booking logic, modal, wildcard handling, or any other file. The `expandedSections` state and `toggleSection` function become unused and will also be removed for cleanliness.

Do not touch any other files or edge functions or any code besides the above. 