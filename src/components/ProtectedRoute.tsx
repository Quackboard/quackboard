import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useProducerSlug } from '@/hooks/useProducerSlug';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, loading } = useAuth();
  const location = useLocation();
  const { slug, isLoading: slugLoading, isError: slugError } = useProducerSlug();

  if (loading || (user && slugLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const fromOnboarding = location.state?.fromOnboarding;

  // Match prior behavior on fetch errors: do not force onboarding (avoids redirect loops).
  const needsOnboardingSlug =
    !slugLoading &&
    !slugError &&
    slug === null &&
    location.pathname !== '/onboarding' &&
    !fromOnboarding;

  if (needsOnboardingSlug) {
    return <Navigate to="/onboarding" replace />;
  }

  return <>{children}</>;
}
