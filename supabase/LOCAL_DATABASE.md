# Local Supabase and migrations

## Why `supabase start` failed

The earliest migration [`20251210053025_04663f1c-687b-4f67-9f37-664ed0f69165.sql`](migrations/20251210053025_04663f1c-687b-4f67-9f37-664ed0f69165.sql) runs **`INSERT INTO producers`**, but **no migration in this repo creates** `public.producers` (or the rest of the core schema). That schema was created on the **hosted** Supabase project (Lovable / dashboard) before these SQL files existed.

On a **fresh** local database, migrations run in filename order and fail immediately on that `INSERT`.

## Recommended fix: add a baseline from production (one time)

You need a **schema-only** migration that runs **before** `20251210053025_*`. Typical workflow:

1. **CLI login**

   ```bash
   supabase login
   ```

2. **Link this repo** to the hosted project (`project_id` matches [`config.toml`](config.toml)):

   ```bash
   cd /path/to/quackboard-ultra-lean
   supabase link --project-ref dkbahxjibpobbefqufqa
   ```

3. **Pull or dump schema** into a **new migration** whose timestamp sorts **before** `20251210053025`:

   Prefer what your CLI version recommends. Options people use:

   - **`supabase db pull`** (creates a migration from remote vs tracked history — follow CLI prompts).

   - **Schema dump** (then inspect / trim extensions you do not want in git):

     ```bash
     supabase db dump --linked --schema public -f supabase/migrations/20250101090000_remote_public_baseline.sql
     ```

     Use a timestamp such as **`20250101090000`** so it runs **before** the December 2025 files.

4. **Reset local** so everything reapplies cleanly:

   ```bash
   supabase db reset
   ```

If the dump contains objects already recreated by extensions or Supabase internals, strip those lines until `db reset` is clean — or use `--schema` selectively per Supabase docs.

## Alternative: rely on hosted DB only

If you **do not** need a disposable local Postgres, keep using the **hosted** URL + anon key in the app (`src/integrations/supabase/client.ts`) and skip `supabase start` for app testing.
