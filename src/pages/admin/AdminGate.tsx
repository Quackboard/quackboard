import { ReactNode, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PasswordInput } from '@/components/ui/password-input';
import { Label } from '@/components/ui/label';

const ADMIN_EMAIL = 'sarah@quackboard.com';
const STORAGE_KEY = 'quackboard_admin_unlocked';

export function AdminGate({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const [unlocked, setUnlocked] = useState(
    () => typeof window !== 'undefined' && window.localStorage.getItem(STORAGE_KEY) === 'true'
  );
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user || user.email !== ADMIN_EMAIL) {
    return <Navigate to="/" replace />;
  }

  if (unlocked) return <>{children}</>;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const expected = import.meta.env.VITE_ADMIN_PASSWORD;
    if (expected && password === expected) {
      window.localStorage.setItem(STORAGE_KEY, 'true');
      setUnlocked(true);
      setError(null);
    } else {
      setError('Incorrect password.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Card className="w-full max-w-sm p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <h1 className="text-xl font-semibold text-foreground">Admin access</h1>
            <p className="text-sm text-muted-foreground mt-1">Enter the admin password to continue.</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="admin-password">Password</Label>
            <PasswordInput
              id="admin-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoFocus
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
          <Button type="submit" className="w-full">Unlock</Button>
        </form>
      </Card>
    </div>
  );
}
