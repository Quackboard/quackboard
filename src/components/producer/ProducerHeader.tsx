import { Producer } from '@/types/database';

interface ProducerHeaderProps {
  producer: Producer;
}

export function ProducerHeader({ producer }: ProducerHeaderProps) {
  return (
    <header className="mb-8">
      <h1 className="text-3xl font-bold text-foreground tracking-tight">
        {producer.name}
      </h1>
      {producer.venue_name && (
        <p className="mt-1 text-lg text-accent-foreground/80">
          {producer.venue_name}
        </p>
      )}
    </header>
  );
}
