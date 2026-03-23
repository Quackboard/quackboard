

## Plan: Add Columns + Import External Mics via Script

### Step 1 -- Migration: Add columns to events table
Add two nullable text columns via SQL migration. No defaults, no constraints, no RLS changes.

```sql
ALTER TABLE public.events ADD COLUMN instagram_url text;
ALTER TABLE public.events ADD COLUMN source_link text;
```

### Step 2 -- Import ~44 rows via lov-exec Python script
- Read uploaded XLSX with pandas
- Filter out rows with date before 2026-03-23
- Convert dates from `M/D/YY` to `YYYY-MM-DD`
- Convert times from `7:00 PM` format to `19:00:00` (24h string, no TZ math) -- columns are `time without time zone`, display code reads them as-is
- Set `producer_id = NULL`, `is_info_only = true`, `status = 'published'`, `sections_config = '[]'::jsonb`
- Include `instagram_url` and `source_link` values from spreadsheet
- INSERT into events table via psql

### Step 3 -- Update DiscoverMics.tsx
- Add `description, instagram_url, source_link` to the query SELECT
- Expandable description: tap/click a chevron to toggle description text below card metadata (React state with a Set of expanded event IDs)
- For info-only mics with `source_link`: render "More Info" link with `target="_blank" rel="noopener noreferrer"`
- For info-only mics with `instagram_url`: render Instagram icon link with `target="_blank" rel="noopener noreferrer"`
- External mics don't link to producer pages (no slug)

### Step 4 -- Regenerate Supabase types
Auto-updates after migration to include `instagram_url` and `source_link` on the events type.

### Files touched
- **Migration** (new): add two columns
- **lov-exec script** (one-time, `/tmp/`): import ~44 rows
- **`src/pages/DiscoverMics.tsx`**: query + card UI updates

### What does NOT change
- EventCard, SpotList, producer pages, booking flow
- RLS policies, triggers, views
- Existing external link security (all already have `rel="noopener noreferrer"`)

