import { Producer } from '@/types/database';
import ReactMarkdown from 'react-markdown';
import { Instagram, Globe } from 'lucide-react';

interface ProducerHeaderProps {
  producer: Producer;
}

function ensureHttps(url: string): string {
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  return `https://${url}`;
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
      {producer.venue_address && (
        <a
          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(producer.venue_address)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-1 inline-flex items-center gap-1 text-sm text-primary hover:underline"
        >
          📍 {producer.venue_address}
        </a>
      )}
      {(producer.instagram || producer.website) && (
        <div className="mt-3 flex items-center gap-4">
          {producer.instagram && (
            <a
              href={ensureHttps(producer.instagram)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
            >
              <Instagram className="h-4 w-4" />
              Instagram
            </a>
          )}
          {producer.website && (
            <a
              href={ensureHttps(producer.website)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
            >
              <Globe className="h-4 w-4" />
              Website
            </a>
          )}
        </div>
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
