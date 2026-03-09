import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Producer, Event, Booking } from '@/types/database';
import { ProducerHeader } from '@/components/producer/ProducerHeader';
import { DaySelector } from '@/components/producer/DaySelector';
import { EventCard } from '@/components/producer/EventCard';
import { Skeleton } from '@/components/ui/skeleton';
import { isUUID } from '@/lib/slug';

function isEventPast(event: Event): boolean {
  const now = new Date();
  const eventEnd = new Date(`${event.date}T${event.end_time}`);
  return now > eventEnd;
}

export default function ProducerPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const [showPastEvents, setShowPastEvents] = useState(false);

  const { data: producer, isLoading: producerLoading } = useQuery({
    queryKey: ['producer', slug],
    queryFn: async () => {
      // Check if it's a UUID (backwards compatibility)
      if (isUUID(slug!)) {
        const { data, error } = await supabase
          .from('producers')
          .select('*')
          .eq('id', slug)
          .maybeSingle();
        
        if (error) throw error;
        
        // If found by UUID and has a slug, redirect to slug URL
        if (data?.slug) {
          navigate(`/producer/${data.slug}`, { replace: true });
          return data as Producer;
        }
        
        return data as Producer | null;
      }
      
      // Fetch by slug
      const { data, error } = await supabase
        .from('producers')
        .select('*')
        .eq('slug', slug)
        .maybeSingle();
      
      if (error) throw error;
      return data as Producer | null;
    },
    enabled: !!slug,
  });

  

  const { data: events, isLoading: eventsLoading } = useQuery({
    queryKey: ['producer-events', producer?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('producer_id', producer!.id)
        .eq('status', 'published')
        .order('date', { ascending: true })
        .order('start_time', { ascending: true });
      
      if (error) throw error;
      return data as Event[];
    },
    enabled: !!producer?.id,
  });

  // Get all event IDs to fetch bookings
  const eventIds = events?.map(e => e.id) || [];

  const { data: bookings } = useQuery({
    queryKey: ['event-bookings', eventIds],
    queryFn: async () => {
      if (eventIds.length === 0) return [];
      
      const { data, error } = await supabase
        .from('bookings')
        .select('id, event_id, slot_position, guest_name, cancelled_at')
        .in('event_id', eventIds)
        .is('cancelled_at', null);
      
      if (error) throw error;
      return data as Booking[];
    },
    enabled: eventIds.length > 0,
  });

  const refetchBookings = () => {
    queryClient.invalidateQueries({ queryKey: ['event-bookings', eventIds] });
  };

  // Only show current/future events on public page
  const currentEvents = (events || []).filter(e => !isEventPast(e));
  const eventDates = currentEvents.length > 0
    ? [...new Set(currentEvents.map(e => e.date))].sort()
    : [];

  // Auto-select first current date, otherwise first past date
  useEffect(() => {
    if (events && !selectedDate) {
      const firstCurrentDate = currentEvents
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        .map(e => e.date)[0];

      if (firstCurrentDate) {
        setSelectedDate(firstCurrentDate);
      } else if (eventDates.length > 0) {
        setSelectedDate(eventDates[0]);
      }
    }
  }, [events, selectedDate, currentEvents, eventDates]);

  // All events for selected date, sorted chronologically
  const filteredEvents = currentEvents
    .filter(e => e.date === selectedDate)
    .sort((a, b) => a.start_time.localeCompare(b.start_time));

  if (producerLoading) {
    return (
      <main className="min-h-screen bg-background">
        <div className="container max-w-lg mx-auto px-4 py-8">
          <Skeleton className="h-12 w-3/4 mb-2" />
          <Skeleton className="h-6 w-1/2" />
        </div>
      </main>
    );
  }

  if (!producer) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground mb-2">Producer not found</h1>
          <p className="text-muted-foreground">The producer you're looking for doesn't exist.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="container max-w-lg mx-auto px-4 py-8">
        <ProducerHeader producer={producer} />
        
        {eventsLoading ? (
          <div className="mt-8 space-y-4">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        ) : eventDates.length === 0 ? (
          <div className="mt-8 text-center py-12">
            <p className="text-muted-foreground">No events scheduled.</p>
          </div>
        ) : (
          <div className="mt-8 space-y-4">
            <DaySelector
              dates={eventDates}
              selectedDate={selectedDate}
              onSelectDate={setSelectedDate}
            />

            <div className="space-y-2">
              {filteredEvents.map(event => (
                <EventCard
                  key={event.id}
                  event={event}
                  bookings={bookings?.filter(b => b.event_id === event.id) || []}
                  producerVenueName={producer.venue_name}
                  onBookingSuccess={refetchBookings}
                />
              ))}
            </div>

          </div>
        )}
      </div>
    </main>
  );
}
