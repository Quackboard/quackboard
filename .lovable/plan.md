

## Set up cron job for low-signup alert

### Summary
Create a database migration to enable `pg_cron` and `pg_net`, then schedule the existing `check-low-signup-alert` edge function to run every 15 minutes. The function already filters for the specific account (`c9f7bec9-9c8a-4e0f-87ff-2e64832c1027`) and only alerts when an event is ~2 hours away with 4 or fewer signups.

### Why every 15 minutes?
The cron job itself runs every 15 minutes, but the edge function contains the logic to only match events starting in the 1.5–2.5 hour window. This ensures the check fires close to the 2-hour mark without needing per-event scheduling.

### Technical details

**Step 1: Database migration — enable extensions**
```sql
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;
```

**Step 2: SQL insert (not a migration — contains project-specific secrets)**
Schedule the cron job to invoke the existing edge function every 15 minutes:
```sql
SELECT cron.schedule(
  'check-low-signup-alert-every-15min',
  '*/15 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://dkbahxjibpobbefqufqa.supabase.co/functions/v1/check-low-signup-alert',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer <anon_key>"}'::jsonb,
    body := concat('{"time": "', now(), '"}')::jsonb
  ) AS request_id;
  $$
);
```

### What is NOT touched
- Zero frontend files modified
- Zero edge functions modified (the function is already deployed)
- No changes to booking, signup, or cancellation flows
- No RLS policy changes

### Files changed: 0 application files
- 1 database migration (extensions only)
- 1 SQL insert via Supabase tool (cron schedule)

