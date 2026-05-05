import { useParams, useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect, useCallback, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import { Instagram, Globe, MapPin } from 'lucide-react';

import { supabase } from '@/integrations/supabase/client';
import { fetchAccountPageData } from '@/lib/fetchAccountPageData';
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

  const { data, isLoading } = useQuery({
    queryKey: ['account-page', slug],
    queryFn: () => fetchAccountPageData(slug!, supabase),
    enabled: !!slug && !isReserved,
    placeholderData: (prev) => prev,
  });

  const account = data?.account as Record<string, unknown> | null | undefined;
  const producer = data?.producer as Record<string, unknown> | null | undefined;
  const events = (data?.events ?? []) as (Event & { bookings: Booking[] })[];

  const eventIds = useMemo(() => events.map((e) => e.id), [events]);

  const invalidateAccountPage = useCallback(() => {
    if (!slug) return;
    queryClient.invalidateQueries({ queryKey: ['account-page', slug] });
  }, [queryClient, slug]);

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
            invalidateAccountPage();
          }
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [eventIdsKey, invalidateAccountPage]);

  // Window filtering (same as ProducerPage)
  const windowDays = (producer?.event_window_days as number | undefined) ?? 7;
  const windowEnd = new Date();
  windowEnd.setDate(windowEnd.getDate() + windowDays - 1);
  const currentEvents = events.filter(e => {
    if (isEventPast(e)) return false;
    const eventDate = new Date(e.date);
    return eventDate <= windowEnd;
  });
  const eventDates = currentEvents.length > 0
    ? [...new Set(currentEvents.map(e => e.date))].sort()
    : [];

  // Auto-select first date
  useEffect(() => {
    if (events.length > 0 && !selectedDate) {
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
  const displayName = (account?.account_name as string | undefined) || (producer?.name as string | undefined) || 'Unknown';
  const venueName = (account?.venue_name as string | undefined) || (producer?.venue_name as string | undefined);
  const venueAddress = (account?.venue_address as string | undefined) || (producer?.venue_address as string | undefined);
  const bioMarkdown = (account?.bio_markdown as string | undefined) || (producer?.bio_markdown as string | undefined);
  const instagram = (account?.instagram as string | undefined) || (producer?.instagram as string | undefined);
  const website = (account?.website as string | undefined) || (producer?.website as string | undefined);
  const headerImageUrl = (account?.header_image_url as string | undefined) || (producer?.header_image_url as string | undefined);
  const profileImageUrl = (account?.profile_image_url as string | undefined) || (producer?.profile_image_url as string | undefined);

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
        {eventDates.length === 0 ? (
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
                        bookings={event.bookings ?? []}
                        producerVenueName={venueName as string | null | undefined}
                        onBookingSuccess={invalidateAccountPage}
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
                  bookings={event.bookings ?? []}
                  producerVenueName={venueName as string | null | undefined}
                  onBookingSuccess={invalidateAccountPage}
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
