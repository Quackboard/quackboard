import { ProducerLayout } from '@/components/layouts/ProducerLayout';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { Loader2, Plus, ExternalLink } from 'lucide-react';
import { EventRow } from '@/components/dashboard/EventRow';
import { parseISO, isPast } from 'date-fns';

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

  return (
    <ProducerLayout>
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-semibold text-foreground">Your Mics</h1>
          <div className="flex items-center gap-3">
            <Link 
              to={`/producer/${user?.id}`}
              className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"
            >
              View My Page
              <ExternalLink className="h-3 w-3" />
            </Link>
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
