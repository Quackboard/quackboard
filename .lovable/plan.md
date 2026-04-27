## Fix wildcard cutoff on recurring events

Wildcard sections on recurring events never auto-open because the recurring generator copies the template's `sections_config` verbatim into each event row, leaving the wildcard with `signup_opens_at_days_before` + `signup_opens_at_time` instead of the resolved `signup_opens_at` UTC timestamp the UI reads. Single-event creation already does this resolution — recurring events do not. Fix matches single-event behavior exactly.

## Changes

### 1. `src/lib/recurring-event-generator.ts`
Add a new exported helper:

```ts
buildEventSectionsConfig(templateSectionsConfig, eventDateStr, timezone)
```

For each section: if `type === 'wildcard'` with both `signup_opens_at_days_before` and `signup_opens_at_time` set, compute `eventDate − days_before` at the given time, convert from producer timezone to UTC via `fromZonedTime`, and return `{ label, slots, type: 'wildcard', signup_opens_at }`. Otherwise return the section unchanged. Adds `date-fns-tz` import (already used elsewhere in the codebase).

### 2. `src/pages/CreateRecurringMic.tsx`
In the per-event insert (line 429), replace `sections_config: sectionsConfig` with `sections_config: buildEventSectionsConfig(sectionsConfig, ev.date, timezone)`. Template insert keeps the editable form.

### 3. `supabase/functions/regenerate-recurring-events/index.ts`
- Fetch each template's producer timezone (extra select on `producers.timezone`, fallback `America/Los_Angeles`).
- Inline the same `buildEventSectionsConfig` logic (Edge Functions can't import from `src/`). Use `fromZonedTime` from `date-fns-tz` via `https://esm.sh/date-fns-tz@3.2.0`.
- Replace `sections_config: tpl.sections_config` in the per-event insert with the resolved config.

### 4. Backfill migration
One-off SQL migration: for every event row with `date >= today` whose `sections_config` contains a wildcard section missing `signup_opens_at` but with `signup_opens_at_days_before` and `signup_opens_at_time` set, recompute the resolved value using the producer's timezone and update `sections_config`. Scoped UPDATE; no schema change.

## Verification

- Re-query sarah-beth's future events — every wildcard section has a `signup_opens_at`.
- Manually invoke the regenerator via curl — confirm new inserts (if any) carry the resolved field.
- Spot-check the public page → wildcard countdown renders, matches single-event behavior.

## Out of scope

No schema changes, no UI changes, no RLS changes, no other edge functions, no template-row shape changes.
