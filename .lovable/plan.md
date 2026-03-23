## Plan: Discover Page -- Compact Schedule View

### Problems visible

- Full street addresses repeat on every card, adding visual noise
- Many same-venue events (e.g., 8 "No Bad Mics" slots) create a wall of near-identical cards
- No way to filter by time of day, which is how comics actually browse

### Changes (single file: `src/pages/DiscoverMics.tsx`)

**1. Sticky date headers**

- Add `sticky top-0 z-10 bg-background` to each date group header so the current date stays visible while scrolling

**2. Remove full address, show city only**

- Drop the `MapPin` / `venue_address` line entirely from card preview
- Add `city` to the Supabase query SELECT
- Show venue as `Venue Name · City` on the time line (e.g., `7:00 PM – 9:00 PM · The Comedy Store · West Hollywood`)

**3. Replace top filters with time-of-day filters**

- Remove "All", "Today", "This Week"
- Replace with: `All` (default), `Morning` (start_time < 12:00), `Afternoon` (12:00–16:59), `Evening` (17:00+)
- Keep day-of-week toggle chips below with exact dates
- Both filters combine (e.g., "Evening" + "Wed" shows Wednesday evening mics)

**4. Compact card design**

- Reduce padding and spacing to show more events per screen
- Single-line format: **Title** on first line, `Time · Venue · City` on second line, badges on the right
- No third line (address removed)

### Visual structure

```text
[All] [Morning] [Afternoon] [Evening]
[Sun] [Mon] [Tue] [Wed] [Thu] [Fri] [Sat]

── Today · Monday, March 23 ─────── (sticky)

┌────────────────────────────────────────┐
│ No Bad Mics                     [▼]   │
│ 1:30 PM – 2:30 PM · Best Comedy · WeHo│
├────────────────────────────────────────┤
│ No Bad Mics                     [▼]   │
│ 2:30 PM – 3:30 PM · Best Comedy · WeHo│
├────────────────────────────────────────┤
│ Potluck                    [badges][▼]│
│ 4:00 PM – 9:00 PM · Comedy Store · WeHo│
└────────────────────────────────────────┘
```

### What does NOT change

- Data fetching queries, producer allowlist, availability logic
- Expandable description + external links behavior
- Producer page linking, badge logic