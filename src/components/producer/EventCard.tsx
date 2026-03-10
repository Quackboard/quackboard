import { useState, useEffect, useCallback } from 'react';
import { Event, Booking, Section } from '@/types/database';
import { CardContent } from '@/components/ui/card';
import { Clock, MapPin, ChevronDown, ChevronUp } from 'lucide-react';
import { SpotList } from './SpotList';
import { parseISO, isAfter, format, differenceInMilliseconds, differenceInSeconds } from 'date-fns';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface EventCardProps {
  event: Event;
  bookings: Booking[];
  producerVenueName?: string | null;
  onBookingSuccess: () => void;
}

function formatTime(time: string): string {
  const [hours, minutes] = time.split(':');
  const hour = parseInt(hours, 10);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 || 12;
  return `${hour12}:${minutes} ${ampm}`;
}

function parseSectionsConfig(config: unknown): Section[] {
  if (Array.isArray(config)) {
    return config.filter(
      (item): item is Section =>
        typeof item === 'object' &&
        item !== null &&
        typeof item.label === 'string' &&
        typeof item.slots === 'number'
    );
  }
  return [];
}

function formatDateTime(dateStr: string): string {
  const date = parseISO(dateStr);
  return format(date, "MMM d 'at' h:mm a");
}

function getSignupStatus(event: Event): { label: string; isOpen: boolean } {
  const now = new Date();
  
  if (event.signup_opens_at && isAfter(parseISO(event.signup_opens_at), now)) {
    return { label: `Sign-ups open ${formatDateTime(event.signup_opens_at)}`, isOpen: false };
  }
  if (!event.signup_opens_at && event.publish_at && isAfter(parseISO(event.publish_at), now)) {
    return { label: `Sign-ups open ${formatDateTime(event.publish_at)}`, isOpen: false };
  }
  return { label: '', isOpen: true };
}

function formatCountdown(totalSeconds: number): string {
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `Opens in ${mins}:${secs.toString().padStart(2, '0')}`;
}

function useAutoOpenTimer(event: Event) {
  const [now, setNow] = useState(() => new Date());

  const getTargetTime = useCallback((): Date | null => {
    if (event.signup_opens_at) return parseISO(event.signup_opens_at);
    if (event.publish_at) return parseISO(event.publish_at);
    return null;
  }, [event.signup_opens_at, event.publish_at]);

  useEffect(() => {
    const target = getTargetTime();
    if (!target || !isAfter(target, new Date())) return;

    const msUntilOpen = differenceInMilliseconds(target, new Date());

    // Set timeout to force re-render at exact open time
    const openTimer = setTimeout(() => setNow(new Date()), msUntilOpen + 50);

    // If within 5 minutes, start countdown interval
    let countdownInterval: ReturnType<typeof setInterval> | undefined;
    if (msUntilOpen <= 5 * 60 * 1000) {
      countdownInterval = setInterval(() => setNow(new Date()), 1000);
    } else {
      // Start countdown when we're 5 minutes away
      const countdownStartTimer = setTimeout(() => {
        setNow(new Date());
        countdownInterval = setInterval(() => setNow(new Date()), 1000);
      }, msUntilOpen - 5 * 60 * 1000);

      // Clean up the start timer too
      const origCleanup = openTimer;
      return () => {
        clearTimeout(origCleanup);
        clearTimeout(countdownStartTimer);
        if (countdownInterval) clearInterval(countdownInterval);
      };
    }

    // Visibility change handler for backgrounded tabs
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        setNow(new Date());
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      clearTimeout(openTimer);
      if (countdownInterval) clearInterval(countdownInterval);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [getTargetTime]);

  const target = getTargetTime();
  const countdown = target && isAfter(target, now)
    ? (() => {
        const secsLeft = differenceInSeconds(target, now);
        return secsLeft <= 300 ? formatCountdown(secsLeft) : null;
      })()
    : null;

  return { now, countdown };
}

export function EventCard({ event, bookings, producerVenueName, onBookingSuccess }: EventCardProps) {
  const [expanded, setExpanded] = useState(false);
  const isMobile = useIsMobile();
  const sections = parseSectionsConfig(event.sections_config);
  const showVenue = event.venue_name !== producerVenueName;
  const eventTime = `${formatTime(event.start_time)} - ${formatTime(event.end_time)}`;
  const { countdown } = useAutoOpenTimer(event);
  const signupStatus = getSignupStatus(event);

  const totalSlots = sections.filter(s => s.type !== 'wildcard').reduce((sum, s) => sum + s.slots, 0);
  const bookedCount = bookings.length;

  // Desktop: fully expanded card (unchanged)
  if (!isMobile) {
    return (
      <div className="rounded-lg border bg-card text-card-foreground shadow-sm card-hover">
        <CardContent className="pt-4 space-y-2">
          <div className="flex items-center gap-2 text-foreground">
            <Clock className="h-4 w-4" />
            <span className="text-sm font-medium">{eventTime}</span>
          </div>
          
          {showVenue && (
            <div className="flex items-start gap-2 text-muted-foreground">
              <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <div className="text-sm">
                <p className="font-medium text-card-foreground">{event.venue_name}</p>
                <p>{event.venue_address}</p>
              </div>
            </div>
          )}
          
          {!signupStatus.isOpen && (
            <p className="text-sm text-muted-foreground">
              {countdown || signupStatus.label}
            </p>
          )}
          
          {signupStatus.isOpen && sections.length > 0 && (
            <>
              <SpotList 
                sectionsConfig={sections} 
                bookings={bookings} 
                eventId={event.id}
                eventTime={eventTime}
                allowMultipleSpots={event.allow_multiple_slots ?? false}
                onBookingSuccess={onBookingSuccess}
              />
              <p className="text-xs text-muted-foreground pt-1">
                Spots fill up fast — check back periodically as people sometimes cancel.
              </p>
            </>
          )}
        </CardContent>
      </div>
    );
  }

  // Mobile: compact collapsible schedule row
  return (
    <Collapsible open={expanded} onOpenChange={setExpanded}>
      <CollapsibleTrigger asChild>
        <button className={cn(
          "w-full flex items-center justify-between px-3 py-2.5 rounded-lg border bg-card text-card-foreground text-left",
          expanded && "rounded-b-none border-b-0"
        )}>
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-medium text-foreground">{eventTime}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              {totalSlots - bookedCount}/{totalSlots} available
            </span>
            {expanded 
              ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> 
              : <ChevronDown className="h-4 w-4 text-muted-foreground" />
            }
          </div>
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent className="rounded-b-lg border border-t-0 bg-card px-3 pb-3">
        <div className="space-y-2 pt-1">
          {showVenue && (
            <div className="flex items-start gap-2 text-muted-foreground">
              <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <div className="text-sm">
                <p className="font-medium text-card-foreground">{event.venue_name}</p>
                <p>{event.venue_address}</p>
              </div>
            </div>
          )}
          
          {!signupStatus.isOpen && (
            <p className="text-sm text-muted-foreground">
              {countdown || signupStatus.label}
            </p>
          )}
          
          {signupStatus.isOpen && sections.length > 0 && (
            <SpotList 
              sectionsConfig={sections} 
              bookings={bookings} 
              eventId={event.id}
              eventTime={eventTime}
              allowMultipleSpots={event.allow_multiple_slots ?? false}
              onBookingSuccess={onBookingSuccess}
            />
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
