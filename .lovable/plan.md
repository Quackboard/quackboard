

## Finalized Plan: Discover Mics Page + Wildcard Interleave Fix

### Part 1: Interleave Wildcard Slots
Already implemented in `SpotList.tsx`. No further changes needed.

### Part 2: Discover Mics Page

#### Step 1 -- Database Migration

Single migration that:

1. Adds columns to `events`: `city` (text, nullable), `latitude` (double precision, nullable), `longitude` (double precision, nullable)

2. Creates simplified VIEW:

```sql
CREATE VIEW public.event_availability AS
SELECT
  e.id AS event_id,
  COALESCE(
    (SELECT SUM((s->>'slots')::int)
     FROM jsonb_array_elements(e.sections_config) s),
    0
  ) AS total_slots,
  COALESCE(
    (SELECT COUNT(*)
     FROM bookings b
     WHERE b.event_id = e.id AND b.cancelled_at IS NULL),
    0
  ) AS booked_count
FROM events e
WHERE e.status = 'published';
```

No RLS changes needed -- existing "Anyone can view published events" SELECT policy covers the base `events` table.

#### Step 2 -- New file: `src/pages/DiscoverMics.tsx`

Public page. No auth.

**Query:** Supabase client fetches from `events` with status='published' and date >= today (LA timezone). LEFT JOIN to `producers` for slug/name. Separately query `event_availability` view for badge data. Join client-side by event_id.

**Timezone:** Hardcode `America/Los_Angeles`. Use `date-fns-tz` (`toZonedTime`) to compute "today". Do NOT reference `producers.timezone`.

**Filters (all client-side after fetch):**
- **Day of week** -- Mon-Sun toggle buttons, derived from `events.date`
- **Today** -- compare `events.date` to today in LA timezone
- **Starting Soon** -- fetch events for today+tomorrow, then filter: `date + start_time` in LA timezone within `[now, now+2h]`

**Badge logic (simplified):**

| Condition | Badge |
|---|---|
| `is_info_only = false` | **Verified** (always) |
| Platform mic, `total_slots - booked_count > 0` | **Spots Available** |
| Platform mic, `total_slots - booked_count <= 0` | **Full** |
| `is_info_only = true` | No badges |

**Card content:** mic name, venue, time, day. Platform mics link to `/producer/{slug}` when slug exists. External mics: neutral listing, no link, no badges.

**Null producer safety:** LEFT JOIN ensures external mics with `producer_id = NULL` are included. Producer link only rendered when slug is non-null.

#### Step 3 -- Edit `src/App.tsx`

Add public route: `<Route path="/discover" element={<DiscoverMics />} />`

#### What does NOT change
- Existing pages, bookings, producer pages, signup flow, booking logic
- The `type` column (not read or written)
- RLS policies
- Edge functions
- `producers.timezone` usage on other pages

#### Files summary
- **New:** `src/pages/DiscoverMics.tsx`
- **Edit:** `src/App.tsx` (add route)
- **Migration:** add columns + create VIEW

