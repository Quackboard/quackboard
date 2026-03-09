

## Plan: Real-time Spots & Auto-open Signups

### Overview
Three changes to make the public producer page live-update: (1) database migration to enable Realtime on bookings, (2) Supabase Realtime subscription in ProducerPage, (3) auto-open timer + countdown in EventCard and SpotList.

---

### 1. Database Migration
Add the `bookings` table to the Supabase Realtime publication so channel subscriptions receive events:
```sql
ALTER PUBLICATION supabase_realtime ADD TABLE bookings;
```

### 2. `src/pages/ProducerPage.tsx` — Realtime subscription
- Add a `useEffect` that, when `eventIds` are known, creates a Supabase channel subscribing to `postgres_changes` (INSERT, UPDATE, DELETE) on the `bookings` table
- On any change, call `queryClient.invalidateQueries({ queryKey: ['event-bookings'] })` to refetch
- Clean up channel on unmount / when eventIds change
- ~20 lines of new code

### 3. `src/components/producer/EventCard.tsx` — Auto-open timer + countdown
- Add a `useEffect` + `useState` that:
  - Computes target open time from `signup_opens_at` or `publish_at`
  - If target is in the future, sets `setTimeout` to force re-render at the exact moment
  - If within 5 minutes, starts a 1-second `setInterval` showing "Opens in X:XX" countdown
  - Adds a `visibilitychange` listener to re-check when tab becomes visible again (handles browser throttling)
- The existing `getSignupStatus` function stays unchanged — re-render is sufficient
- All timers cleaned up on unmount

### 4. `src/components/producer/SpotList.tsx` — Wildcard auto-open
- Same timer pattern for `wildcardSection.signup_opens_at`
- Add `useState` + `useEffect` with `setTimeout` to flip `wildcardCutoffPassed` when the cutoff arrives
- Optional countdown for last 5 minutes before wildcard opens
- All timers cleaned up on unmount

### What stays unchanged
- `SignUpModal.tsx` — already handles race conditions via pre-check + unique constraint error `23505`
- Database schema — no new tables or columns
- All booking insert logic — untouched
- RLS policies — the existing "Anyone can view bookings for published events" policy covers Realtime reads

### Risk
- Migration is a single additive statement — no data or schema changes
- If Realtime disconnects, behavior degrades to current manual-refresh (no breakage)
- Timers use standard setTimeout/setInterval with proper cleanup

