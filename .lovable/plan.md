## Goal

Build a daily cron-driven regenerator that maintains a rolling 30-day window of events for every active recurring template — picking up exactly where the previous run left off, with no gaps and no duplicates.

## Decisions (from your answers)

- **Cadence:** daily
- **Window:** always 30 days from today
- **End date:** stop generating, keep template active
- **Template edits:** out of scope for this version (only adding new events; existing future events untouched). Reasoning: refreshing existing events introduces real risk of silently changing producer-visible details and is best handled as a follow-up.

## What I'll build

**1. New edge function: `supabase/functions/regenerate-recurring-events/index.ts**`

Self-contained (no `src/` imports — per edge function rules). Mirrors the generator + signup_opens_at logic.

Per active template:

1. Skip if `is_active = false` or `recurrence_rule` missing.
2. Find latest existing future event for this template → `windowStart = max(today, latestDate + 1)`.
3. `windowEnd = today + 30 days`, capped at `recurrence_end_date` if set.
4. If `windowStart > windowEnd`, nothing to do.
5. Generate dates in `[windowStart, windowEnd]` using the rule (weekly / every-other-week / monthly-by-date / monthly-by-day / hourly).
  - For `interval=2` (every other week), use the earliest existing event for the template as the parity anchor so the alternation stays consistent across runs.
6. Defensive de-dup: skip any `(date, start_time)` already in `events` for that template.
7. Insert remaining events with `status='published'`, copying title / venue / sections_config / producer_message / allow_multiple_slots from the template, and computing `signup_opens_at` using the template's rolling hours or fixed anchor.
8. Return summary: `templates_processed`, `templates_skipped`, `events_inserted`, `errors[]`.

Uses service role key, runs without JWT. Logs summary to console.

**2. Cron job (via insert tool, not migration — contains anon key)**

```sql
select cron.schedule(
  'regenerate-recurring-events-daily',
  '0 9 * * *',  -- 09:00 UTC daily (~1-2am PT)
  $$ select net.http_post(
       url:='https://dkbahxjibpobbefqufqa.supabase.co/functions/v1/regenerate-recurring-events',
       headers:='{"Content-Type": "application/json", "Authorization": "Bearer <anon>"}'::jsonb,
       body:='{}'::jsonb
     ); $$
);
```

## Out of scope (explicit)

- No changes to `CreateRecurringMic.tsx`, `EditMic`, `Dashboard`, public account page, signup flow, or any other edge function.
- No DB schema changes (uses existing columns).
- No "refresh future events on template edit" — separate follow-up.
- No auto-deactivation of templates past their end date — they stay active per your answer.

## Verification plan

After deploy:

1. Curl the function once manually; check the JSON summary.
2. Inspect `events` table for one of your active templates to confirm new rows appear with correct dates / signup_opens_at and no dupes.
3. Confirm cron job is scheduled in `cron.job`.

Do not touch any other files, pages, or edge functions. 