## Impact Analysis and Minimal Plan

### What changes

1. **New DB function** `get_discoverable_producers(producer_ids uuid[])` — brand new, touches nothing existing
2. **New column** `events.account_id` (nullable uuid) + backfill — additive only, no existing code references `account_id` on events
3. **One file edit**: `src/pages/DiscoverMics.tsx` — replace the broken `accounts_users` query with `.rpc('get_discoverable_producers', ...)`

### What is NOT affected


| Area                                              | Why safe                                                                                                                                                         |
| ------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Booking flow (`create-booking`, `cancel-booking`) | Queries `events` by `id`, never reads `account_id`                                                                                                               |
| Producer pages (`ProducerPage.tsx`)               | Queries `producers` by slug/id, untouched                                                                                                                        |
| Onboarding / EditProfile                          | Updates `producers` table, untouched                                                                                                                             |
| Dashboard / CalendarDashboard                     | Queries `events` by `producer_id`, untouched                                                                                                                     |
| Edge functions (notifications, emails)            | Query `producers` + `events` by existing columns, untouched                                                                                                      |
| `useProducerSlug.ts`                              | Also queries `accounts_users` (may silently fail for authenticated users), but this hook is NOT part of this change and works via `producers` table primary path |
| `ProtectedRoute.tsx` / `AuthCallback.tsx`         | Query `producers` only, untouched                                                                                                                                |
| Lineup / SpotList / SignUpModal                   | Query `events` + `bookings`, never touch account mapping                                                                                                         |
| Embed functions                                   | Query `producers` by slug, untouched                                                                                                                             |


### Files touched: exactly 1 code file + 2 migrations

**Migration 1** — Security definer function:

```sql
CREATE OR REPLACE FUNCTION public.get_discoverable_producers(producer_ids uuid[])
RETURNS TABLE(user_id uuid, slug text, account_name text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT au.user_id, a.slug, a.account_name
  FROM accounts_users au
  JOIN accounts a ON a.id = au.account_id
  WHERE au.user_id = ANY(producer_ids)
    AND a.discoverable = true;
$$;
```

**Migration 2** — Add nullable `account_id` to events + backfill:

```sql
ALTER TABLE events ADD COLUMN account_id uuid;
UPDATE events e SET account_id = au.account_id
  FROM accounts_users au WHERE au.user_id = e.producer_id;
```

`**src/pages/DiscoverMics.tsx**` — Replace the `accountsData` query (lines 82-107) with:

```ts
const { data: accountsData } = useQuery({
  queryKey: ['discover-accounts', producerIds],
  queryFn: async () => {
    if (producerIds.length === 0) return [];
    const { data, error } = await supabase.rpc('get_discoverable_producers', {
      producer_ids: producerIds
    });
    if (error) throw error;
    return data || [];
  },
  enabled: producerIds.length > 0,
});
```

Update `accountMap` builder (lines 110-117) to use the RPC result shape directly:

```ts
const accountMap = useMemo(() => {
  const m = new Map<string, { slug: string; discoverable: boolean | null; account_name: string }>();
  accountsData?.forEach(entry => {
    m.set(entry.user_id, { slug: entry.slug, discoverable: true, account_name: entry.account_name });
  });
  return m;
}, [accountsData]);
```

### Risk assessment

- **Zero risk** to booking, cancellation, lineup, or producer management flows
- The `account_id` column is nullable and additive — existing INSERT/UPDATE statements on events won't break
- The RPC function is new and only called from the browse page
- The browse page is currently hidden/disabled per project memory, further reducing risk

Do not touch any files rsl policies or edge functions except for whats listed in "what changes" 

&nbsp;