import { Navbar } from '@/components/Navbar';
import { useAuth } from '@/contexts/AuthContext';

export default function Dashboard() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="max-w-4xl mx-auto px-4 py-12">
        <h1 className="text-2xl font-semibold text-foreground">Welcome to your dashboard!</h1>
        <p className="text-muted-foreground mt-2">
          We're still building this out. Check back soon.
        </p>
      </main>
    </div>
  );
}
