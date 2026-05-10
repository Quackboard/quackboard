import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface AdminAccountDetail {
  account: { id: string; account_name: string } | null;
  templates: { id: string; title: string; created_at: string | null }[];
  events: { id: string; title: string; date: string; created_at: string | null }[];
}

export function useAdminAccountDetail(accountId: string | undefined) {
  return useQuery<AdminAccountDetail>({
    queryKey: ['admin', 'account', accountId],
    enabled: !!accountId,
    queryFn: async () => {
      const [accountRes, templatesRes, eventsRes] = await Promise.all([
        supabase.from('accounts').select('id, account_name').eq('id', accountId!).maybeSingle(),
        supabase
          .from('event_templates')
          .select('id, title, created_at')
          .eq('account_id', accountId!)
          .order('created_at', { ascending: false }),
        supabase
          .from('events')
          .select('id, title, date, created_at')
          .eq('account_id', accountId!)
          .order('date', { ascending: false }),
      ]);
      if (accountRes.error) throw accountRes.error;
      if (templatesRes.error) throw templatesRes.error;
      if (eventsRes.error) throw eventsRes.error;
      return {
        account: accountRes.data as any,
        templates: (templatesRes.data ?? []) as any,
        events: (eventsRes.data ?? []) as any,
      };
    },
  });
}
