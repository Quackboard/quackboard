import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Hook to get the current user's producer slug
 * Returns slug if set, null if not set, undefined while loading
 */
export function useProducerSlug() {
  const { user } = useAuth();

  const { data: producer, isLoading } = useQuery({
    queryKey: ['producer-profile', user?.id],
    queryFn: async () => {
      // Try producers table first
      const { data: producerData, error: producerError } = await supabase
        .from('producers')
        .select('slug, name')
        .eq('id', user!.id)
        .maybeSingle();

      if (producerError) throw producerError;
      if (producerData?.slug) return producerData;

      // Fallback to accounts table via accounts_users
      const { data: accountLink } = await supabase
        .from('accounts_users')
        .select('account_id')
        .eq('user_id', user!.id)
        .maybeSingle();

      if (accountLink?.account_id) {
        const { data: accountData } = await supabase
          .from('accounts')
          .select('slug, account_name')
          .eq('id', accountLink.account_id)
          .maybeSingle();

        if (accountData?.slug) {
          return { slug: accountData.slug, name: accountData.account_name };
        }
      }

      return producerData;
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 5,
  });

  return {
    slug: producer?.slug || null,
    name: producer?.name || null,
    isLoading,
    needsOnboarding: !isLoading && producer && !producer.slug,
  };
}
