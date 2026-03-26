

## Plan: Per-Event Relative `signup_opens_at` for Recurring Events

### The Bug

When creating recurring events with "sign-ups open later", the form captures an absolute date/time (e.g., "March 25 at 10:00 AM") and applies that exact timestamp to every recurring instance. So a weekly mic on March 27, April 3, April 10 all get signup_opens_at = March 25 10:00 AM -- obviously wrong for April events.

### The Fix

**Change the UI input** from an absolute date+time picker to a relative "days before + time" input when the signup option is "later". This applies to both recurring and single events for consistency.

- Replace the `signupOpensAt` (Date) and `signupOpensAtTime` (string) fields with:
  - `signupDaysBefore` (number) -- e.g., `2` means "2 days before the event date"
  - `signupOpensAtTime` (string) -- e.g., `"10:00"` meaning "at 10:00 AM on that day"
- The form shows: `[ 2 ] days before at [ 10:00 AM ]`
- Preview text below: "Sign-ups will open 2 days before each event at 10:00 AM"

**Compute per event on submit:**
- For each event (single or recurring), calculate: `signup_opens_at = event.date - N days + time`, converted to UTC via the producer's timezone
- This replaces the current logic that blindly copies one timestamp to all events

### Files Changed

**`src/pages/CreateMic.tsx`**
- Replace `signupOpensAt` (date picker) + `signupOpensAtTime` with `signupDaysBefore` (number input) + `signupOpensAtTime` (time input)
- Update zod schema: remove `signupOpensAt` date field, add `signupDaysBefore` as optional number
- Update validation: ensure `daysBefore * 24h > 0` and that the computed signup time is before event start
- Update `onSubmit`: compute `signup_opens_at` per event instance using `event_date - daysBefore + time`
- For the recurring path (line ~291-316): compute `signupOpensAt` inside the `.map()` per `dateObj` instead of using one shared value

**`src/pages/EditMic.tsx`**
- Same schema/UI changes
- When loading an existing event, reverse-compute `daysBefore` from the stored `signup_opens_at` and event `date` (difference in days)
- On save, recompute the absolute timestamp from the relative offset

**`src/pages/DuplicateMic.tsx`**
- No changes needed -- it copies raw event data and navigates to create, so the new logic will apply naturally

### Technical Details

- The `signup_opens_at` column in the `events` table stays as-is (timestamptz) -- no schema change needed. The offset is only a UI concept; the database always stores absolute timestamps.
- Validation: `signupDaysBefore` must be >= 0. If 0 days before, the time must still be before the event's `startTime`. For daysBefore >= 1, always valid.
- For EditMic reverse computation: `daysBefore = differenceInCalendarDays(eventDate, signupDate)`. If the stored value doesn't align to a clean day boundary, round to nearest and show the time.

