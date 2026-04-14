import { useParams, useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect, useCallback, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import { Instagram, Globe, MapPin } from 'lucide-react';

import { supabase } from '@/integrations/supabase/client';
import { Event, Booking } from '@/types/database';
import { DaySelector } from '@/components/producer/DaySelector';
import { EventCard } from '@/components/producer/EventCard';
import { Skeleton } from '@/components/ui/skeleton';
import NotFound from './NotFound';

// NOTE: If you add a new top-level route to App.tsx, add it here too.
const RESERVED_SLUGS = new Set([
  'login', 'signup', 'auth', 'onboarding', 'dashboard', 'admin',
  'create', 'events', 'cancel', 'edit-profile', 'embed', 'preview',
  'browse', 'privacy', 'terms', 'email-preview', 'producer',
]);

function ensureHttps(url: string): string {
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  return `https://${url}`;
}

function instagramUrl(value: string): string {
  const cleaned = value.replace(/^@/, '').trim();
  if (cleaned.includes('instagram.com')) return ensureHttps(cleaned);
  return `https://instagram.com/${cleaned}`;
}

function isEventPast(event: Event): boolean {
  const now = new Date();
  const eventEnd = new Date(`${event.date}T${event.end_time}`);
  return now > eventEnd;
}

export default function AccountPage() {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();
  const dateParam = searchParams.get('date');
  const timeParam = searchParams.get('time');
  const [selectedDate, setSelectedDate] = useState<string | null>(dateParam);
  const queryClient = useQueryClient();

  const isReserved = !!slug && RESERVED_SLUGS.has(slug);

  // 1. Query accounts table for profile display
  const { data: account, isLoading: accountLoading } = useQuery({
    queryKey: ['account', slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('accounts')
        .select('*')
        .eq('slug', slug!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!slug && !isReserved,
  });

  // 2. Query producers table for producer_id and event_window_days
  const { data: producer, isLoading: producerLoading } = useQuery({
    queryKey: ['account-producer', slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('producers')
        .select('*')
        .eq('slug', slug!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!slug && !isReserved,
  });

  // 3. Query published events
  const { data: events, isLoading: eventsLoading } = useQuery({
    queryKey: ['account-events', producer?.id],
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

  // 4. Query bookings for all event IDs
  const eventIds = useMemo(() => events?.map(e => e.id) || [], [events]);

  const { data: bookings } = useQuery({
    queryKey: ['account-bookings', eventIds],
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
    placeholderData: (prev) => prev,
    refetchInterval: 10_000,
  });

  const refetchBookings = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['account-bookings'] });
  }, [queryClient]);

  // Realtime subscription on bookings
  const eventIdsKey = eventIds.join(',');
  useEffect(() => {
    if (eventIds.length === 0) return;
    const channel = supabase
      .channel('account-bookings')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'bookings' },
        (payload) => {
          const eventId = (payload.new as any)?.event_id || (payload.old as any)?.event_id;
          if (eventId && eventIds.includes(eventId)) {
            refetchBookings();
          }
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [eventIdsKey, refetchBookings]);

  // Window filtering (same as ProducerPage)
  const windowDays = producer?.event_window_days ?? 7;
  const windowEnd = new Date();
  windowEnd.setDate(windowEnd.getDate() + windowDays - 1);
  const currentEvents = (events || []).filter(e => {
    if (isEventPast(e)) return false;
    const eventDate = new Date(e.date);
    return eventDate <= windowEnd;
  });
  const eventDates = currentEvents.length > 0
    ? [...new Set(currentEvents.map(e => e.date))].sort()
    : [];

  // Auto-select first date
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

  const filteredEvents = currentEvents
    .filter(e => e.date === selectedDate)
    .sort((a, b) => a.start_time.localeCompare(b.start_time));

  // --- Early returns after all hooks ---

  if (isReserved) {
    return <NotFound />;
  }

  const isLoading = accountLoading || producerLoading;

  if (isLoading) {
    return (
      <main className="min-h-screen bg-background">
        <div className="container max-w-lg mx-auto px-4 py-8">
          <Skeleton className="h-12 w-3/4 mb-2" />
          <Skeleton className="h-6 w-1/2" />
        </div>
      </main>
    );
  }

  if (!account && !producer) {
    return <NotFound />;
  }

  // Use account data with producer fallback
  const displayName = account?.account_name || producer?.name || 'Unknown';
  const venueName = account?.venue_name || producer?.venue_name;
  const venueAddress = account?.venue_address || producer?.venue_address;
  const bioMarkdown = account?.bio_markdown || producer?.bio_markdown;
  const instagram = account?.instagram || producer?.instagram;
  const website = account?.website || producer?.website;
  const headerImageUrl = account?.header_image_url || producer?.header_image_url;
  const profileImageUrl = account?.profile_image_url || producer?.profile_image_url;

  return (
    <main className="min-h-screen bg-background">
      <div className="container max-w-lg mx-auto px-4 py-8">
        {/* Profile Header */}
        <header className="mb-8">
          {headerImageUrl && (
            <div className="w-full h-40 rounded-lg overflow-hidden mb-4">
              <img
                src={headerImageUrl}
                alt=""
                className="w-full h-full object-cover"
              />
            </div>
          )}

          <div className="flex items-start gap-4">
            {profileImageUrl && (
              <img
                src={profileImageUrl}
                alt={displayName}
                className={`w-16 h-16 rounded-full object-cover border-2 border-background ${headerImageUrl ? '-mt-12 relative z-10' : ''}`}
              />
            )}
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-foreground tracking-tight">
                {displayName}
              </h1>
            </div>
          </div>

          {venueAddress && (
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(venueAddress)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-flex items-center gap-1 text-sm text-primary hover:underline"
            >
              <MapPin className="h-3.5 w-3.5" />
              {venueAddress}
            </a>
          )}

          {bioMarkdown && (
            <div className="mt-4 prose prose-sm max-w-none text-muted-foreground prose-a:text-primary hover:prose-a:underline">
              <ReactMarkdown
                components={{
                  a: ({ href, children }) => (
                    <a
                      href={href ? ensureHttps(href) : '#'}
                      target="_blank"
                      rel="noopener noreferrer"
                      referrerPolicy="no-referrer"
                    >
                      {children}
                    </a>
                  ),
                }}
              >{bioMarkdown}</ReactMarkdown>
            </div>
          )}

          {(instagram || website) && (
            <div className="mt-3 flex items-center gap-4">
              {instagram && (
                <a
                  href={instagramUrl(instagram)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Instagram className="h-4 w-4" />
                  Instagram
                </a>
              )}
              {website && (
                <a
                  href={ensureHttps(website)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Globe className="h-4 w-4" />
                  Website
                </a>
              )}
            </div>
          )}
        </header>

        {/* Event Listing */}
        {eventsLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        ) : eventDates.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No events scheduled.</p>
          </div>
        ) : (
          <div className="space-y-4">
            <DaySelector
              dates={eventDates}
              selectedDate={selectedDate}
              onSelectDate={setSelectedDate}
            />
            {/* Desktop: time gutter layout; Mobile: stacked cards */}
            <div className="hidden md:block space-y-2">
              {filteredEvents.map(event => {
                const startParts = event.start_time.split(':');
                const startDate = new Date(2000, 0, 1, +startParts[0], +startParts[1]);
                const timeLabel = startDate.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
                return (
                  <div key={event.id} className="flex gap-4 items-start">
                    <div className="w-20 shrink-0 pt-3 text-right text-sm font-medium text-muted-foreground">
                      {timeLabel}
                    </div>
                    <div className="flex-1 min-w-0">
                    <EventCard
                        event={event}
                        bookings={bookings?.filter(b => b.event_id === event.id) || []}
                        producerVenueName={venueName}
                        onBookingSuccess={refetchBookings}
                        autoExpand={!!timeParam && event.start_time === timeParam}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="md:hidden space-y-2">
              {filteredEvents.map(event => (
                <EventCard
                  key={event.id}
                  event={event}
                  bookings={bookings?.filter(b => b.event_id === event.id) || []}
                  producerVenueName={venueName}
                  onBookingSuccess={refetchBookings}
                  autoExpand={!!timeParam && event.start_time === timeParam}
                />
              ))}
            </div>
          </div>
        )}

        <footer className="mt-12 pt-6 border-t border-border text-center space-y-2">
          <div>
            <span className="text-sm text-muted-foreground">
              More stage time is out there.{' '}
              <a href="/browse" target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground transition-colors">
                Browse open mics that fit your schedule
              </a> →
            </span>
          </div>
          <div>
            <a href="/" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
              <img src="/favicon.png" alt="Quackboard" className="h-4 w-4" />
              <span>Powered by <span className="font-medium font-outfit">Quackboard</span></span>
            </a>
          </div>
        </footer>
      </div>
    </main>
  );
}
