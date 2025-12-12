import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { LogOut } from 'lucide-react';

export function Navbar() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <nav className="border-b border-border bg-background">
      <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
        <span className="text-lg font-semibold text-foreground">Quackboard</span>
        
        {user && (
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleSignOut}
            className="text-muted-foreground hover:text-foreground"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Log out
          </Button>
        )}
      </div>
    </nav>
  );
}
