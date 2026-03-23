

## Plan: Remove "Full for now" Label

### What changes
**File:** `src/components/producer/EventCard.tsx`

Remove lines 187-191 — the conditional block that renders "Full for now, but keep checking this page as people sometimes cancel." This text will never be shown regardless of availability state.

### What does NOT change
- Wildcard logic, spot claiming, badges, or any other EventCard behavior
- Discover page, producer pages, booking flow

