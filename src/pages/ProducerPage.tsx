import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Producer, Event, Booking } from '@/types/database';
import { ProducerHeader } from '@/components/producer/ProducerHeader';
import { DaySelector } from '@/components/producer/DaySelector';
import { EventCard } from '@/components/producer/EventCard';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { isUUID } from '@/lib/slug';

interface EventWithStatus extends Omit<Event, 'status'> {
  status: 'upcoming' | 'active' | 'past';
}

function getEventStatus(event: Event): 'upcoming' | 'active' | 'past' {
  const now = new Date();
  const eventDate = new Date(event.date);
  const [startHour, startMinute] = event.start_time.split(':').map(Number);
  const [endHour, endMinute] = event.end_time.split(':').map(Number);

  const eventStart = new Date(eventDate);
  eventStart.setHours(startHour, startMinute, 0, 0);

  const eventEnd = new Date(eventDate);
  eventEnd.setHours(endHour, endMinute, 0, 0);

  if (now < eventStart) {
    return 'upcoming';
  } else if (now >= eventStart && now <= eventEnd) {
    return 'active';
  } else {
    return 'past';
  }
}

export default function ProducerPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const queryClient = useQueryClient();

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

  const today = new Date().toISOString().split('T')[0];

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

  // Group and sort events by status
  const now = new Date();
  const allEventsWithStatus: EventWithStatus[] = events?.map(event => ({
    ...event,
    status: getEventStatus(event),
  })) || [];

  // Get unique dates that have events
  const eventDates = allEventsWithStatus
    ? [...new Set(allEventsWithStatus.map(e => e.date))].sort()
    : [];

  const activeEvents = allEventsWithStatus.filter(e => e.status === 'active');
  const upcomingEvents = allEventsWithStatus.filter(e => e.status === 'upcoming');
  const pastEvents = allEventsWithStatus.filter(e => e.status === 'past');

  // Auto-select first upcoming/active date, otherwise first past date
  useEffect(() => {
    if (events && !selectedDate) {
      const firstActiveOrUpcomingDate = allEventsWithStatus
        .filter(e => e.status === 'active' || e.status === 'upcoming')
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        .map(e => e.date)[0];

      if (firstActiveOrUpcomingDate) {
        setSelectedDate(firstActiveOrUpcomingDate);
      } else if (eventDates.length > 0) {
        // If no active/upcoming, select the first past date
        setSelectedDate(eventDates[0]);
      }
    }
  }, [events, selectedDate, allEventsWithStatus, eventDates]);

  // Filter events for selected date
  const filteredActiveEvents = activeEvents.filter(e => e.date === selectedDate);
  const filteredUpcomingEvents = upcomingEvents.filter(e => e.date === selectedDate);
  const filteredPastEvents = pastEvents.filter(e => e.date === selectedDate);

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

            <div className="space-y-6">
              {filteredActiveEvents.length > 0 && (
                <div className="space-y-4">
                  <h2 className="text-xl font-semibold flex items-center gap-2">
                    Active Events
                    <Badge variant="default" className="bg-green-500 hover:bg-green-500">Live</Badge>
                  </h2>
                  {filteredActiveEvents.map(event => (
                    <EventCard
                      key={event.id}
                      event={event}
                      bookings={bookings?.filter(b => b.event_id === event.id) || []}
                      producerVenueName={producer.venue_name}
                      onBookingSuccess={refetchBookings}
                      status={event.status}
                    />
                  ))}
                </div>
              )}

              {filteredUpcomingEvents.length > 0 && (
                <div className="space-y-4">
                  <h2 className="text-xl font-semibold flex items-center gap-2">
                    Upcoming Events
                    <Badge variant="outline" className="text-blue-500 border-blue-500">Upcoming</Badge>
                  </h2>
                  {filteredUpcomingEvents.map(event => (
                    <EventCard
                      key={event.id}
                      event={event}
                      bookings={bookings?.filter(b => b.event_id === event.id) || []}
                      producerVenueName={producer.venue_name}
                      onBookingSuccess={refetchBookings}
                      status={event.status}
                    />
                  ))}
                </div>
              )}

              {filteredPastEvents.length > 0 && (
                <div className="space-y-4">
                  <h2 className="text-xl font-semibold flex items-center gap-2">
                    Past Events
                    <Badge variant="secondary">Past</Badge>
                  </h2>
                  {filteredPastEvents.map(event => (
                    <EventCard
                      key={event.id}
                      event={event as unknown as Event}
                      bookings={bookings?.filter(b => b.event_id === event.id) || []}
                      producerVenueName={producer.venue_name}
                      onBookingSuccess={refetchBookings}
                      status={event.status}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
