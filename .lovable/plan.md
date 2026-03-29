

## Plan: Split Event Creation — Implementation

### Files

| Action | File |
|--------|------|
| **Modify** | `src/pages/CreateMic.tsx` — replace with chooser page; old form code commented out as fallback |
| **Create** | `src/pages/CreateRecurringMic.tsx` — recurring mic form → `event_templates` |
| **Create** | `src/pages/CreateSingleMic.tsx` — one-off show form → `events` with `series_id: null` |
| **Modify** | `src/App.tsx` — add `/create/recurringmic` and `/create/singlemic` routes |

### CreateMic.tsx (chooser)

- Header with back arrow + "Create Mic" title (same layout)
- Two cards: "Set up a recurring mic" links to `/create/recurringmic`, "Add a one-off show" links to `/create/singlemic`
- Entire current form preserved as a block comment at bottom of file

### CreateSingleMic.tsx

- Copy of current CreateMic form logic
- Remove `RecurrenceSelector`, `endDate`, and recurring-dates branch from `onSubmit`
- Insert into `events` with `series_id: null`
- Keep: date picker, time fields, title, venue, **sections builder** (verbatim copy of the inline `useFieldArray` loop + wildcard logic from lines 497–659), scheduling, message, email notifications, draft/publish buttons, cancel dialog

### CreateRecurringMic.tsx

- Form fields: title, description (MarkdownEditor), venue_name, venue_address, start_time, end_time
- **Sections builder**: exact same inline code from CreateMic (lines 497–659) — `useFieldArray`, wildcard section rendering, add section/wildcard buttons, allow multiple slots toggle. Same `sectionSchema` zod validation.
- **Recurrence rule builder**: frequency select (weekly/biweekly/monthly), interval number input, day-of-week multi-select checkboxes (Sun=0…Sat=6), time_start (time input), duration_minutes (number input) — stored as `{ frequency, interval, days, time_start, duration_minutes }`
- **signup_anchor_day**: Select dropdown with day names → integer 0-6
- **signup_anchor_time**: time input
- Additional fields: signup_opens_hours_before (number), recurrence_end_date (date picker), is_active (switch, default true), publish_at (optional datetime)
- Insert into `event_templates` with `producer_id = user.id`
- Type assertion needed: `(supabase.from('event_templates') as any).insert(...)` because `types.ts` is stale (missing `recurrence_rule`, `signup_anchor_day`, `signup_anchor_time` columns)
- Success screen similar to CreateMic's

### App.tsx

Add two protected routes before the catch-all:
```
/create/recurringmic → CreateRecurringMic
/create/singlemic → CreateSingleMic
```

### Type workaround

The generated `types.ts` doesn't reflect the new DB columns (`recurrence_rule`, `signup_anchor_day`, `signup_anchor_time`). Since we cannot edit `types.ts` manually, the recurring mic insert will use a type cast on the insert payload. This is temporary until types are regenerated.

