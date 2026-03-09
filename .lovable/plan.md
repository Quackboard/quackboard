

## Fix: Events Not Showing on Public Page (Timezone Bug)

### Root Cause

In `isEventPast()` in `ProducerPage.tsx`:

```text
new Date('2026-03-09')       → March 9, 00:00 UTC
                              → March 8, 5:00 PM Pacific
setHours(19, 0, 0, 0)        → March 8, 7:00 PM Pacific
                              → March 9, 2:00 AM UTC

now (March 9, 4:44 AM UTC) > eventEnd (March 9, 2:00 AM UTC) = TRUE → "past"
```

The event is for today at 6-7 PM but gets filtered out because the date math crosses a day boundary.

### Fix

**File: `src/pages/ProducerPage.tsx`**

Replace the `isEventPast` function to construct the end datetime as a local time string, avoiding the UTC-vs-local mismatch:

```ts
function isEventPast(event: Event): boolean {
  const now = new Date();
  const eventEnd = new Date(`${event.date}T${event.end_time}`);
  return now > eventEnd;
}
```

Using `new Date('2026-03-09T19:00:00')` (no `Z` suffix) parses as **local time**, which is the correct interpretation since event times are stored as local times for the producer's venue.

### Also Fix

**File: `src/components/producer/EventCard.tsx`** — The same `isEventPast` pattern may not exist here, but the `getSignupStatus` function uses `parseISO` from date-fns which handles ISO strings correctly, so no change needed there.

One-line change, no database or backend modifications required.

