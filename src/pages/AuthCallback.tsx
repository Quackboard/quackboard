import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

export default function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    const handleCallback = async () => {
      // Supabase auto-processes the URL hash tokens
      const { data: { session }, error } = await supabase.auth.getSession();

      if (error || !session) {
        navigate('/login');
        return;
      }

      // Check if producer has completed onboarding
      const { data: producer } = await supabase
        .from('producers')
        .select('name')
        .eq('id', session.user.id)
        .maybeSingle();

      if (!producer || producer.name === null) {
        navigate('/onboarding');
      } else {
        navigate('/dashboard');
      }
    };

    handleCallback();
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mx-auto" />
        <p className="text-muted-foreground mt-4">Signing you in...</p>
      </div>
    </div>
  );
}
