import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { useNavigate, Link } from 'react-router-dom';
import { LogOut, Plus, ExternalLink } from 'lucide-react';
import { useProducerSlug } from '@/hooks/useProducerSlug';

export function Navbar() {
  const { user, signOut } = useAuth();
  const { slug } = useProducerSlug();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const producerPageUrl = slug ? `/producer/${slug}` : `/producer/${user?.id}`;

  return (
    <nav className="border-b border-border bg-background">
      <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link to="/dashboard" className="text-lg font-semibold text-foreground hover:text-foreground/80">
          Quackboard
        </Link>
        
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            asChild
          >
            <Link to="/create">
              <Plus className="h-4 w-4 mr-1" />
              Create Mic
            </Link>
          </Button>
          
          {user && (
            <Button 
              variant="ghost" 
              size="sm" 
              asChild
            >
              <a href={producerPageUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4 mr-1" />
                View My Page
              </a>
            </Button>
          )}
          
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleSignOut}
            className="text-muted-foreground hover:text-foreground"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Log out
          </Button>
        </div>
      </div>
    </nav>
  );
}
