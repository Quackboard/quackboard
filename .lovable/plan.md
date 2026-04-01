

## Plan: Remove all series_id references from codebase

### Overview
The `series_id` column has been dropped from both `event_templates` and `events` tables. Five files reference it and need updating. The grouping logic in Dashboard will switch to using `events.template_id` (which already exists as a foreign key to `event_templates.id`).

### Changes

| # | File | What changes |
|---|------|-------------|
| 1 | `src/pages/CreateRecurringMic.tsx` | Change `.select('id, series_id')` to `.select('id')` on template insert. Remove `series_id: templateData.series_id` from generated event objects. |
| 2 | `src/pages/CreateSingleMic.tsx` | Remove `series_id: null` from the event insert payload (line 220). |
| 3 | `src/pages/Dashboard.tsx` | Remove `series_id` from `EventWithBookings` interface. Remove `series_id` from `TemplateRow` interface. Remove `series_id` from all three event `.select()` queries. Change template query from `'id, title, series_id, ...'` to `'id, title, ...'`. Add `template_id` to `EventWithBookings` and to all three event queries. Re-key `templateMap` by `t.id` instead of `t.series_id`. Change grouping logic to use `event.template_id` instead of `event.series_id`. Update the fallback template object in `recurringGroupsArr` to remove `series_id`. |
| 4 | `src/pages/DuplicateMic.tsx` | Remove the entire series_id block (lines 67–81: reading `original.series_id`, generating UUID, updating original). Remove `series_id: seriesId` from the `newEvent` object. |
| 5 | `src/integrations/supabase/types.ts` | Remove all `series_id` lines from `event_templates` Row/Insert/Update and from `events` Row/Insert/Update (6 lines total). |

### What is NOT touched
- Booking flow, signup flow, public pages, edge functions, RecurringSeriesCard (no series_id references there).

