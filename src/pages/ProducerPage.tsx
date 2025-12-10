import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Producer, Event } from '@/types/database';
import { ProducerHeader } from '@/components/producer/ProducerHeader';
import { DaySelector } from '@/components/producer/DaySelector';
import { EventCard } from '@/components/producer/EventCard';
import { Skeleton } from '@/components/ui/skeleton';

export default function ProducerPage() {
  const { id } = useParams<{ id: string }>();
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const { data: producer, isLoading: producerLoading } = useQuery({
    queryKey: ['producer', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('producers')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      
      if (error) throw error;
      return data as Producer | null;
    },
    enabled: !!id,
  });

  const today = new Date().toISOString().split('T')[0];

  const { data: events, isLoading: eventsLoading } = useQuery({
    queryKey: ['producer-events', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('producer_id', id)
        .eq('status', 'published')
        .gte('date', today)
        .order('date', { ascending: true });
      
      if (error) throw error;
      return data as Event[];
    },
    enabled: !!id,
  });

  // Get unique dates that have events
  const eventDates = events
    ? [...new Set(events.map(e => e.date))].sort()
    : [];

  // Auto-select first date when events load
  useEffect(() => {
    if (eventDates.length > 0 && !selectedDate) {
      setSelectedDate(eventDates[0]);
    }
  }, [eventDates, selectedDate]);

  // Filter events for selected date
  const selectedEvents = events?.filter(e => e.date === selectedDate) || [];

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
            <p className="text-muted-foreground">No upcoming events scheduled.</p>
          </div>
        ) : (
          <>
            <DaySelector
              dates={eventDates}
              selectedDate={selectedDate}
              onSelectDate={setSelectedDate}
            />
            
            <div className="mt-6 space-y-4">
              {selectedEvents.map(event => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
          </>
        )}
      </div>
    </main>
  );
}
