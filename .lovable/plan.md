

## Plan: Redesign Discover Page UX

### Problems to fix
1. Times display in military format (`19:00 – 21:00`) instead of 12-hour (`7:00 PM`)
2. Flat list of cards is hard to scan -- comics want to browse by day
3. Day-of-week filters don't show actual dates

### Approach
Group events by date with sticky date headers, use the existing `formatTime` helper for 12h display, and simplify filters.

### Changes (single file: `src/pages/DiscoverMics.tsx`)

**1. Use `formatTime` for 12-hour display**
- Import `formatTime` from `@/lib/utils`
- Replace `ev.start_time.slice(0, 5) – ev.end_time.slice(0, 5)` with `formatTime(ev.start_time) – formatTime(ev.end_time)`

**2. Group events by date with clear headers**
- After filtering, group events into `Map<string, Event[]>` keyed by date string
- Render each group with a prominent date header: **"Monday, March 24"** (full day name + date)
- Within each group, events sorted by start_time (already sorted from query)

**3. Simplify and improve filters**
- Keep "All", "Today", "This Week" (next 7 days) as top-level quick filters
- Keep day-of-week pill filters but show them as toggle chips below
- Remove "Starting Soon" (low utility, can revisit later) -- or keep if preferred

**4. Card layout improvements**
- Show time more prominently -- move it next to the title or make it the leading element since comics scan by time
- Format: `7:00 PM · Venue Name` on one line for quick scanning
- Date is already in the section header so remove the per-card date line to reduce noise
- Keep venue address, badges, expand chevron as-is

### Visual structure
```text
[All] [Today] [This Week]
[Sun] [Mon] [Tue] [Wed] [Thu] [Fri] [Sat]

── Monday, March 24 ──────────────────
┌─────────────────────────────────────┐
│ Open Mic Title              [badges]│
│ 7:00 PM – 9:00 PM · The Comedy Store│
│ 📍 8433 Sunset Blvd            [▼] │
└─────────────────────────────────────┘
┌─────────────────────────────────────┐
│ Another Mic                         │
│ 9:30 PM – 11:00 PM · Flappers      │
│ 📍 102 E Magnolia Blvd         [▼] │
└─────────────────────────────────────┘

── Tuesday, March 25 ─────────────────
...
```

### What does NOT change
- Data fetching queries, producer allowlist, availability logic
- Expandable description + external links behavior
- Producer page linking logic
- Any other page or component

