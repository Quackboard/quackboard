import { Producer } from '@/types/database';
import ReactMarkdown from 'react-markdown';

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
        <p className="mt-1 text-lg text-muted-foreground">
          {producer.venue_name}
        </p>
      )}
      {producer.bio_markdown && (
        <div className="mt-4 text-sm text-muted-foreground prose prose-sm prose-invert max-w-none prose-p:my-2 prose-a:text-primary prose-a:no-underline hover:prose-a:underline prose-strong:text-foreground prose-em:text-muted-foreground">
          <ReactMarkdown
            components={{
              a: ({ href, children }) => (
                <a href={href} target="_blank" rel="noopener noreferrer">
                  {children}
                </a>
              ),
            }}
          >
            {producer.bio_markdown}
          </ReactMarkdown>
        </div>
      )}
    </header>
  );
}
