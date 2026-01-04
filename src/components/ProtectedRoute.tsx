import { ReactNode, useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, loading } = useAuth();
  const location = useLocation();
  const [checkingSlug, setCheckingSlug] = useState(true);
  const [hasSlug, setHasSlug] = useState<boolean | null>(null);

  useEffect(() => {
    const checkSlug = async () => {
      if (!user) {
        setCheckingSlug(false);
        return;
      }

      const { data, error } = await supabase
        .from('producers')
        .select('slug')
        .eq('id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Error checking slug:', error);
        setHasSlug(true); // Assume has slug on error to avoid redirect loop
      } else {
        setHasSlug(!!data?.slug);
      }
      setCheckingSlug(false);
    };

    if (user && !loading) {
      checkSlug();
    } else if (!loading) {
      setCheckingSlug(false);
    }
  }, [user, loading]);

  if (loading || checkingSlug) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Redirect to onboarding if user doesn't have a slug (except if already on onboarding)
  if (hasSlug === false && location.pathname !== '/onboarding') {
    return <Navigate to="/onboarding" replace />;
  }

  return <>{children}</>;
}
