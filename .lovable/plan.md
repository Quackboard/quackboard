

## Fix: "Show events for the next 7 days" includes too many days

### Problem
When a producer sets "Show events for the next 7 days", the window calculation does `today + 7`, which actually covers **8 calendar days** (today through 7 days from now). For example, if today is Friday April 4, it shows through Friday April 11 — but that means if there's a Sunday event on April 6 AND April 13, both Sundays appear, giving a Sunday-to-Sunday span.

### Fix
Change the window calculation from `today + windowDays` to `today + (windowDays - 1)` so that "7 days" means today plus 6 more days = 7 calendar days total.

### Files to edit

| File | Change |
|------|--------|
| `src/pages/ProducerPage.tsx` (line 132) | `windowEnd.setDate(windowEnd.getDate() + windowDays - 1)` |
| `src/pages/AccountPage.tsx` (line 132-133) | Same fix |
| `supabase/functions/get-producer-events-embed/index.ts` | Check if same window logic applies to the embed endpoint (currently it just fetches future events with a limit of 10 — no window filtering, so no change needed) |

### What stays the same
- The EditProfile page settings UI (7 / 14 / 30 options)
- The label "Show events for the next"
- All event creation, booking, and cancellation flows

