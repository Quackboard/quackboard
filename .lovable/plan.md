## Plan: Collapsible Series View + CreateMic Copy Update

### Files to touch


| Action | File                                               | Purpose                                                                                                          |
| ------ | -------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Create | `src/components/dashboard/RecurringSeriesCard.tsx` | Collapsible series card with expanded instance rows                                                              |
| Create | `src/lib/signup-status.ts`                         | Extract shared `getSignupStatus()` from UpcomingEventCard                                                        |
| Modify | `src/pages/Dashboard.tsx`                          | Add series_id to query/interface, add event_templates query, split remaining events into Recurring/Single groups |
| Modify | `src/components/dashboard/UpcomingEventCard.tsx`   | Import shared `getSignupStatus` instead of local copy                                                            |
| Modify | `src/pages/CreateMic.tsx`                          | Update card labels and subtitles                                                                                 |


**Not touched**: Past tab, Happening Now, Opening Soon, booking flow, lineup view, CreateRecurringMic.tsx, CreateSingleMic.tsx, edge functions, DB tables.

---

### Change 1 — Dashboard Upcoming Tab

**Data layer (Dashboard.tsx)**

- Add `series_id` (nullable) to `EventWithBookings` interface and to the upcoming events Supabase select
- Add new query for `event_templates` (id, title, series_id, start_time, end_time, recurrence_rule) filtered by producer_id, enabled when upcoming tab is active

**Grouping logic (new useMemo)**
After filtering out Happening Now and Opening Soon from `remainingArr`:

- **Recurring**: events where `series_id` is not null, grouped by `series_id`. Each group paired with its template metadata.
- **Single**: events where `series_id` is null, grouped by date with bold date headers (reuses existing `UpcomingEventCard`).
- Empty state only shows if both groups are empty AND happeningNow/openingSoon are empty. If only one group is empty, its section header is hidden entirely.

**RecurringSeriesCard.tsx (new)**

Collapsed state (default):

- Chevron left side, rotates on expand (uses Radix Collapsible already in project)
- Series name bold
- Subtitle: `Mon, Wed · 8:00 PM – 9:00 PM · 4 upcoming shows` (days from `recurrence_rule.days`, times from template)
- "Edit Series" button — disabled, wrapped in Tooltip with "Coming soon"
- Click header toggles expand/collapse

Expanded state:

- `max-h-[400px] overflow-y-auto` container
- Events grouped by date with sticky date headers (`position: sticky; top: 0; bg-background`)
- Compact instance rows showing: time range (bold) | spots available or "Full" in red | X/Y filled | signup status pill | Edit button (`/events/${event.id}/edit` — uses event id, not series id) | Lineup button

**Rendering order in Upcoming tab:**

1. Happening Now (unchanged)
2. Opening Soon (unchanged)
3. "Recurring Mics" header + series cards (only if recurring events exist)
4. "Single Mics" header + date-grouped cards (only if single events exist)
5. Empty state only if all sections are empty

---

### Change 2 — CreateMic.tsx Copy

- "Set up a recurring mic" → "Create a Recurring Mic"
- "Create a template that generates shows on a repeating schedule" → "Schedule a mic that repeats weekly, biweekly, or monthly"
- "Add a one-off show" → "Create a Single Mic"
- "Create a single event on a specific date" → "Add a one-time show on a specific date"

---

### Technical notes

- `getSignupStatus()` extracted to `src/lib/signup-status.ts` so both `UpcomingEventCard` and `RecurringSeriesCard` share it
- Day abbreviation: `recurrence_rule.days` contains numbers 0-6 (Sun-Sat) → mapped to abbreviated names
- Adding `series_id` to Dashboard's local `EventWithBookings` is safe — confirmed it's not shared with other files
- When rendering the days abbreviation in the series card subtitle, if recurrence_rule is null or recurrence_rule.days is missing for any reason, fail gracefully and just omit the days portion of the subtitle rather than crashing. Same for time range — if start_time or end_time is null on the template, omit that portion rather than showing undefined."