import { ReactNode } from 'react';
import { Navbar } from '@/components/Navbar';
import { cn } from '@/lib/utils';

interface ProducerLayoutProps {
  children: ReactNode;
  className?: string;
}

export function ProducerLayout({ children, className }: ProducerLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className={cn("max-w-4xl mx-auto px-4 py-8", className)}>
        {children}
      </main>
    </div>
  );
}
