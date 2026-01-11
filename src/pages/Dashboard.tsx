import { ProducerLayout } from '@/components/layouts/ProducerLayout';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { Loader2, Plus, ExternalLink, Copy, Check } from 'lucide-react';
import { EventRow } from '@/components/dashboard/EventRow';
import { parseISO, isPast } from 'date-fns';
import { useProducerSlug } from '@/hooks/useProducerSlug';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';

interface EventWithBookings {
  id: string;
  title: string;
  date: string;
  start_time: string;
  end_time: string;
  venue_name: string;
  sections_config: { label: string; slots: number }[];
  status: string;
  publish_at: string | null;
  signup_opens_at: string | null;
  bookings: { id: string; slot_position: number; cancelled_at: string | null }[];
}

export default function Dashboard() {
  const { user } = useAuth();
  const { slug } = useProducerSlug();
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const { data: events, isLoading } = useQuery({
    queryKey: ['producer-events', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('events')
        .select(`
          id,
          title,
          date,
          start_time,
          end_time,
          venue_name,
          sections_config,
          status,
          publish_at,
          signup_opens_at,
          bookings (id, slot_position, cancelled_at)
        `)
        .eq('producer_id', user!.id)
        .order('date', { ascending: true });

      if (error) throw error;
      return data as EventWithBookings[];
    },
    enabled: !!user?.id,
  });

  const now = new Date();
  const upcomingEvents = events?.filter(e => !isPast(parseISO(e.date))) || [];
  const pastEvents = events?.filter(e => isPast(parseISO(e.date))) || [];

  const producerPageUrl = slug ? `/producer/${slug}` : `/producer/${user?.id}`;
  const fullPageUrl = `${window.location.origin}${producerPageUrl}`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(fullPageUrl);
      setCopied(true);
      toast({ title: 'Link copied to clipboard' });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ title: 'Failed to copy link', variant: 'destructive' });
    }
  };

  return (
    <ProducerLayout>
        {/* Share Section */}
        {slug && (
          <div className="mb-6 p-4 rounded-lg border border-border bg-muted/30">
            <p className="text-sm font-medium text-foreground mb-2">Your Page</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-sm text-muted-foreground bg-background px-3 py-2 rounded border border-border truncate">
                {fullPageUrl.replace('https://', '').replace('http://', '')}
              </code>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyLink}
                className="shrink-0"
              >
                {copied ? (
                  <>
                    <Check className="h-4 w-4 mr-1" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4 mr-1" />
                    Copy Link
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-semibold text-foreground">Your Mics</h1>
          <div className="flex items-center gap-3">
            <a 
              href={producerPageUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"
            >
              View My Page
              <ExternalLink className="h-3 w-3" />
            </a>
            <Button asChild size="sm">
              <Link to="/create">
                <Plus className="h-4 w-4 mr-1" />
                Create Mic
              </Link>
            </Button>
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {/* Empty State */}
        {!isLoading && events?.length === 0 && (
          <div className="text-center py-16">
            <p className="text-muted-foreground mb-4">No mics yet</p>
            <Button asChild>
              <Link to="/create">
                <Plus className="h-4 w-4 mr-1" />
                Create your first mic
              </Link>
            </Button>
          </div>
        )}

        {/* Events List */}
        {!isLoading && events && events.length > 0 && (
          <div className="space-y-6">
            {/* Upcoming Events */}
            {upcomingEvents.length > 0 && (
              <div className="space-y-3">
                {upcomingEvents.map(event => (
                  <EventRow key={event.id} event={event} />
                ))}
              </div>
            )}

            {/* Past Events */}
            {pastEvents.length > 0 && (
              <div className="space-y-3">
                <h2 className="text-sm font-medium text-muted-foreground pt-4">Past</h2>
                {pastEvents.map(event => (
                  <EventRow key={event.id} event={event} isPast />
                ))}
              </div>
            )}
          </div>
        )}
    </ProducerLayout>
  );
}
