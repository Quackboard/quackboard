import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

export default function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    // Listen for the auth state change triggered by the URL hash tokens
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session) {
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
        } else if (event === 'TOKEN_REFRESHED') {
          // Ignore token refresh events
        } else if (event === 'SIGNED_OUT') {
          navigate('/login');
        }
      }
    );

    // Also check if already signed in (e.g. session was restored before listener fired)
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session) {
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
      }
    });

    // Timeout fallback - if nothing happens after 10s, redirect to login
    const timeout = setTimeout(() => {
      navigate('/login');
    }, 10000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
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
