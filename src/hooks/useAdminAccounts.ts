import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface AdminAccountRow {
  id: string;
  account_name: string;
  created_at: string | null;
  last_activity: string | null;
  total_events: number;
}

export function useAdminAccounts() {
  return useQuery<AdminAccountRow[]>({
    queryKey: ['admin', 'accounts'],
    queryFn: async () => {
      const [{ data: accounts, error: aErr }, { data: events, error: eErr }] = await Promise.all([
        supabase.from('accounts').select('id, account_name, created_at'),
        supabase.from('events').select('account_id, updated_at:created_at'),
      ]);
      if (aErr) throw aErr;
      if (eErr) throw eErr;

      // events table doesn't have updated_at; use created_at as proxy for activity.
      // If/when an updated_at column is added, swap the select above.
      const stats = new Map<string, { count: number; last: string | null }>();
      (events ?? []).forEach((row: any) => {
        if (!row.account_id) return;
        const cur = stats.get(row.account_id) ?? { count: 0, last: null };
        cur.count += 1;
        if (!cur.last || (row.updated_at && row.updated_at > cur.last)) cur.last = row.updated_at;
        stats.set(row.account_id, cur);
      });

      return (accounts ?? []).map((a: any) => {
        const s = stats.get(a.id);
        return {
          id: a.id,
          account_name: a.account_name,
          created_at: a.created_at,
          last_activity: s?.last ?? null,
          total_events: s?.count ?? 0,
        };
      });
    },
  });
}
