

## Plan: Limit Browse Page to Current Week (Mon–Sun)

### Change (single file: `src/pages/DiscoverMics.tsx`)

Compute the current week's Monday and Sunday in LA timezone, then filter the Supabase query to only fetch events within that range.

**Specifically:**

1. Import `startOfWeek`, `endOfWeek`, `addDays` from `date-fns`
2. After computing `nowLA`, calculate:
   - `mondayStr` — start of week with `weekStartsOn: 1` (Monday), formatted as `yyyy-MM-dd`
   - `sundayStr` — end of week with `weekStartsOn: 1`, formatted as `yyyy-MM-dd`
3. Update the Supabase query: replace `.gte('date', todayStr)` with `.gte('date', mondayStr).lte('date', sundayStr)`
4. Update the `queryKey` to include `mondayStr` so the cache refreshes each week

This shows past days of the current week too (e.g., if today is Wednesday, Monday and Tuesday events still appear). If you'd prefer to start from today instead of Monday, let me know.

