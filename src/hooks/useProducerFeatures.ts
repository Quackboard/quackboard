import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export function useProducerFeatures() {
  const { user } = useAuth();

  const { data: features = [], isLoading } = useQuery({
    queryKey: ['producer-features', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('producer_features')
        .select('feature')
        .eq('producer_id', user!.id);

      if (error) throw error;
      return data.map((r) => r.feature);
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 5,
  });

  const hasFeature = (name: string): boolean => features.includes(name);

  return { features, hasFeature, isLoading };
}
