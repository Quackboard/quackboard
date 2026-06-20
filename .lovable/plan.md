## Goal
Set `signup_opens_at` on all future child events of template `c7e3e80f-b4b4-4c15-9d11-bbd3e5f93c81` to **Friday 12:00 PM America/Los_Angeles** (the Friday immediately before each Thursday event).

## Why this works
Each event is on a Thursday, so the prior Friday is `date - 6 days`. Casting `(date - 6) + 12:00` `AT TIME ZONE 'America/Los_Angeles'` produces the correct UTC timestamp and automatically handles the PDT → PST switch in November, so events on either side of DST will both land at 12pm local.

## SQL to run (Supabase SQL Editor, via the data-update tool)

```sql
UPDATE events
SET signup_opens_at =
  (((date - INTERVAL '6 days')::date + TIME '12:00') AT TIME ZONE 'America/Los_Angeles')
WHERE template_id = 'c7e3e80f-b4b4-4c15-9d11-bbd3e5f93c81'
  AND date >= CURRENT_DATE;
```

## Verification query (run after)

```sql
SELECT date,
       signup_opens_at,
       signup_opens_at AT TIME ZONE 'America/Los_Angeles' AS opens_local
FROM events
WHERE template_id = 'c7e3e80f-b4b4-4c15-9d11-bbd3e5f93c81'
  AND date >= CURRENT_DATE
ORDER BY date;
```

Every `opens_local` should read `Friday … 12:00:00`.

## Out of scope
- No fix to the recurring-event generator. New events created by the daily cron will keep landing at 12:00 UTC (5am LA) until that bug is fixed. You may need to re-run this UPDATE periodically, or ask for the generator fix as a follow-up.
- Other templates with the same bug are not touched.
