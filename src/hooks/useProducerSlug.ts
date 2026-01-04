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
      const { data, error } = await supabase
        .from('producers')
        .select('slug, name')
        .eq('id', user!.id)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });

  return {
    slug: producer?.slug || null,
    name: producer?.name || null,
    isLoading,
    needsOnboarding: !isLoading && producer && !producer.slug,
  };
}
