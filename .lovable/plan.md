## Problem

The **End Series Date** in recurring mic setup saves to `event_templates.recurrence_end_date` but is ignored when generating event instances. `generateEventDates()` always produces 30 days from the first show date, so mics get created past the end date.

## Fix

**1. `src/lib/recurring-event-generator.ts`**
- Add an optional `endDate?: Date` parameter to `generateEventDates(firstShowDate, rule, endDate?)`.
- After generating the 30-day window as today, filter out any event whose `date` is after `endDate` (string compare on `yyyy-MM-dd`, inclusive of the end date itself).
- Internal generators are not changed — the cap is applied as a final filter, keeping the diff minimal.

**2. `src/pages/CreateRecurringMic.tsx`**
- Pass `data.recurrenceEndDate` as the third argument to `generateEventDates(firstDate, recurrenceRule, data.recurrenceEndDate)`.
- Add a Zod `.refine()` so `recurrenceEndDate >= firstShowDate` when both are set, with message: "End series date must be on or after the first show date."

## Risk (already discussed)

- `generateEventDates` is only called from `CreateRecurringMic.tsx` — no other page, hook, or edge function imports it.
- The `endDate` param is optional; existing series with no end date behave identically.
- Dashboard, public account page, and signup flow all read existing `events` rows — none of them call the generator. They are unaffected.
- No edge functions, migrations, or other pages touched.

## Follow-up (separate pass after this lands)

Investigate whether a cron job / scheduled DB function regenerates events on a rolling basis past the initial 30 days. If one exists, it must also honor `recurrence_end_date`. No code search has surfaced one yet.
