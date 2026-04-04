import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { useNavigate, Link } from 'react-router-dom';
import { LogOut, Plus, ExternalLink, Menu, X, LayoutDashboard, UserPen } from 'lucide-react';
import { useProducerSlug } from '@/hooks/useProducerSlug';
import { cn } from '@/lib/utils';

export function Navbar() {
  const { user, signOut } = useAuth();
  const { slug } = useProducerSlug();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const producerPageUrl = slug ? `/${slug}` : null;

  const closeMobileMenu = () => setMobileMenuOpen(false);

  return (
    <nav className="border-b border-border bg-background sticky top-0 z-50">
      <div className="max-w-4xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          <Link to="/dashboard" className="hover:opacity-80 transition-opacity">
            <span className="text-xl font-bold text-foreground">Quackboard</span>
          </Link>
          
          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-1">
            <Button 
              variant="ghost" 
              size="sm" 
              asChild
              className="px-2"
            >
              <Link to="/dashboard">
                <LayoutDashboard className="h-4 w-4 mr-1" />
                Dashboard
              </Link>
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              asChild
              className="px-2"
            >
              <Link to="/create">
                <Plus className="h-4 w-4 mr-1" />
                Create
              </Link>
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              asChild
              className="px-2"
            >
              <Link to="/edit-profile">
                <UserPen className="h-4 w-4 mr-1" />
                Profile
              </Link>
            </Button>
            
            {producerPageUrl && (
              <Button 
                variant="ghost" 
                size="sm" 
                asChild
                className="px-2"
              >
                <a href={producerPageUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4 mr-1" />
                  View My Public Page
                </a>
              </Button>
            )}
            
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleSignOut}
              className="text-muted-foreground hover:text-foreground px-2"
            >
              <LogOut className="h-4 w-4 mr-1" />
              Log out
            </Button>
          </div>

          {/* Mobile Menu Button */}
          <Button
            variant="ghost"
            size="sm"
            className="md:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
          >
            {mobileMenuOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </Button>
        </div>

        {/* Mobile Navigation */}
        <div
          className={cn(
            "md:hidden overflow-hidden transition-all duration-200 ease-in-out",
            mobileMenuOpen ? "max-h-64 mt-3" : "max-h-0"
          )}
        >
          <div className="flex flex-col gap-1 py-2 border-t border-border">
            <Button 
              variant="ghost" 
              size="sm" 
              asChild
              className="justify-start"
              onClick={closeMobileMenu}
            >
              <Link to="/dashboard">
                <LayoutDashboard className="h-4 w-4 mr-2" />
                Dashboard
              </Link>
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              asChild
              className="justify-start"
              onClick={closeMobileMenu}
            >
              <Link to="/create">
                <Plus className="h-4 w-4 mr-2" />
                Create Mic
              </Link>
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              asChild
              className="justify-start"
              onClick={closeMobileMenu}
            >
              <Link to="/edit-profile">
                <UserPen className="h-4 w-4 mr-2" />
                Edit Profile
              </Link>
            </Button>
            
            {producerPageUrl && (
              <Button 
                variant="ghost" 
                size="sm" 
                asChild
                className="justify-start"
              >
                <a href={producerPageUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  View My Page
                </a>
              </Button>
            )}
            
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleSignOut}
              className="justify-start text-muted-foreground hover:text-foreground"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Log out
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
}
