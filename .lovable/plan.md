

## Fix: Edit page signup helper text to show specific date/time

### Problem
On the Edit Mic page, the helper text says generic "Sign-ups will open 6 days before the event at 09:00" instead of showing a calculated specific date like the Create Single Mic page does (e.g., "Sign-ups will open on Sat, 4/5/2025 at 11:00 AM").

### Fix
Replace the static text at lines 960-964 of `src/pages/EditMic.tsx` with the same calculated date/time logic used in `CreateSingleMic.tsx`.

### File to edit

| File | Change |
|------|--------|
| `src/pages/EditMic.tsx` (lines 960-964) | Replace static "X days before" text with computed date: subtract `signupDaysBefore` from `watchDate`, format with weekday/month/day/year, convert time to 12-hour format |

### Implementation detail
Use the same pattern from CreateSingleMic (lines 466-489): parse `watchDate`, subtract days, format date with `toLocaleDateString`, convert time to 12-hour AM/PM, and display as "Sign-ups will open on {formatted} at {timeStr}".

