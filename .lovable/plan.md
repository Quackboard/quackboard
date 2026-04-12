## Re-open the Browse Mics Page

### Overview

Re-enable `/browse` with a rolling 7-day window, date-labeled day filters, spot availability counts, a "Grab a Spot" CTA, and the community submission form. The CTA and producer data will be sourced from the `accounts` table (not `producers`) to align with the planned phase-out.

### Files touched

- `src/App.tsx` -- add `/browse` route
- `src/pages/Index.tsx` -- add "Browse Mics" nav link
- `src/pages/DiscoverMics.tsx` -- main updates

### Changes

**1. `src/App.tsx**`
Add `<Route path="/browse" element={<DiscoverMics />} />` above the `/:slug` catch-all.

**2. `src/pages/Index.tsx**`
Add a "Browse Mics" link in the nav/header area.

**3. `src/pages/DiscoverMics.tsx**`

**Switch producer lookup to `accounts` table**: Replace the query from `producers` with a query to `accounts` joined through `accounts_users` to get slug and discoverable status. This ensures the CTA links use the account slug (canonical source going forward).

**Rolling 7-day window**: Replace fixed Mon-Sun range with today through today+6. Generate day buttons dynamically from these 7 dates.

**Day filter labels with dates**: Buttons show `"Mon 4/14"` format using actual dates from the rolling window. Filtering matches by exact date string instead of day-of-week index.

**Spots available count**: For platform mics (`is_info_only === false`), show the actual remaining count as a badge: e.g. "3 spots open".

**Sign-up CTA**: For platform mics with available spots and an account slug, show a "Grab a Spot" button linking to `/${accountSlug}`. This uses the slug from the `accounts` table.

**Card layout**:

```text
┌──────────────────────────────────────────────────┐
│ Event Title                                      │
│ 7:00 PM – 9:00 PM · Venue · City                │
│                                                  │
│ [On Quackboard]  [3 spots open]  [Grab a Spot →] │
└──────────────────────────────────────────────────┘
```

Info-only events keep current layout (expandable description, external links, no CTA).

**Community submissions**: `<ListMicSheet />` is already rendered -- becomes accessible once the route is live.

### Technical detail: accounts query

Instead of querying `producers` for slug/discoverable, query `accounts` directly using the producer_id via `accounts_users`:

1. Collect unique `producer_id` values from events
2. Query `accounts_users` where `user_id` in those IDs to get `account_id`
3. Query `accounts` for `slug`, `discoverable`, `account_name`
4. Build the lookup map keyed by `user_id` (producer_id)

This keeps all public-facing URLs grounded in the `accounts` table.

### No database changes needed. Do not touch any other files or edge functions. 