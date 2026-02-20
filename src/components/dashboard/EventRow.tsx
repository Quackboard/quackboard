import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { format, parseISO, isAfter } from 'date-fns';
import { cn } from '@/lib/utils';
import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { sendMicGoesLiveEmail } from '@/lib/email';
import { useIsMobile } from '@/hooks/use-mobile';

interface Section {
  label: string;
  slots: number;
}

interface EventRowProps {
  event: {
    id: string;
    title: string;
    date: string;
    start_time: string;
    end_time: string;
    venue_name: string;
    sections_config: Section[];
    status: string;
    publish_at: string | null;
    signup_opens_at: string | null;
    bookings: { id: string; slot_position: number; cancelled_at: string | null }[];
  };
  isPast?: boolean;
}

function formatTime(time: string): string {
  const [hours, minutes] = time.split(':');
  const hour = parseInt(hours, 10);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 || 12;
  return `${hour12}:${minutes} ${ampm}`;
}

function formatDateTime(dateStr: string): string {
  const date = parseISO(dateStr);
  return format(date, "MMM d 'at' h:mm a");
}

function parseSections(config: unknown): Section[] {
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

export function EventRow({ event, isPast = false }: EventRowProps) {
  const now = new Date();
  const isMobile = useIsMobile();
  const sections = parseSections(event.sections_config);
  const activeBookings = event.bookings.filter(b => !b.cancelled_at);
  const emailSentRef = useRef(false);

  // Status logic - status is declared when creating the mic
  const getStatus = () => {
    if (event.status === 'draft') {
      return { label: 'Draft', className: 'text-muted-foreground' };
    }
    if (event.status === 'published') {
      // If publish_at is in the future, show scheduled
      if (event.publish_at && isAfter(parseISO(event.publish_at), now)) {
        return { 
          label: `Scheduled — goes live ${formatDateTime(event.publish_at)}`, 
          className: 'text-muted-foreground' 
        };
      }
      // Otherwise, if published, show Live
      return { label: 'Live', className: 'text-green-500' };
    }
    return { label: event.status, className: 'text-muted-foreground' };
  };

  const status = getStatus();
  const isLive = status.label === 'Live';

  // Send email when event transitions to "Live" status
  useEffect(() => {
    if (!isLive || emailSentRef.current) return;

    const sendEmail = async () => {
      // Check for pending scheduled message (only send once)
      const { data: scheduledMessages } = await supabase
        .from('scheduled_messages')
        .select('id, producer_id')
        .eq('event_id', event.id)
        .eq('status', 'pending')
        .limit(1);

      if (scheduledMessages && scheduledMessages.length > 0) {
        try {
          await sendMicGoesLiveEmail({
            eventId: event.id,
            producerId: scheduledMessages[0].producer_id || '',
          });
          
          // Mark scheduled message as sent
          await supabase
            .from('scheduled_messages')
            .update({ status: 'sent', sent_at: new Date().toISOString() })
            .eq('id', scheduledMessages[0].id);
          
          emailSentRef.current = true;
        } catch (error) {
          console.error('Error sending mic goes live email:', error);
        }
      }
    };

    sendEmail();
  }, [isLive, event.id]);

  // Signup status logic
  const getSignupStatus = () => {
    // If signup_opens_at is set and in the future, show that time
    if (event.signup_opens_at && isAfter(parseISO(event.signup_opens_at), now)) {
      return { 
        label: `Opens ${formatDateTime(event.signup_opens_at)}`, 
        className: 'text-muted-foreground' 
      };
    }
    // If signup_opens_at is null but publish_at is in the future, sign-ups open when mic goes live
    if (!event.signup_opens_at && event.publish_at && isAfter(parseISO(event.publish_at), now)) {
      return { 
        label: `Opens ${formatDateTime(event.publish_at)}`, 
        className: 'text-muted-foreground' 
      };
    }
    // Otherwise sign-ups are open
    return { label: 'Open', className: 'text-foreground' };
  };

  const signupStatus = getSignupStatus();

  // Calculate slot ranges and booking counts per section
  const getSectionStats = () => {
    let startSlot = 1;
    return sections.map(section => {
      const endSlot = startSlot + section.slots - 1;
      const bookedCount = activeBookings.filter(
        b => b.slot_position >= startSlot && b.slot_position <= endSlot
      ).length;
      const stats = { label: section.label, booked: bookedCount, total: section.slots };
      startSlot = endSlot + 1;
      return stats;
    });
  };
  const sectionStats = getSectionStats();

  return (
    <Card className={cn(
      "border-border",
      isPast && "opacity-50"
    )}>
      <CardContent className="py-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          {/* Left: Event Info */}
          <div className="space-y-1.5 min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium text-foreground">
                {format(parseISO(event.date), 'EEE, MMM d')}
              </span>
              <span className="text-muted-foreground">
                {formatTime(event.start_time)} - {formatTime(event.end_time)}
              </span>
            </div>
            
            <p className="font-medium text-foreground">{event.title}</p>
            
            {sectionStats.length > 0 && (
              <div className="text-sm text-muted-foreground space-y-0.5">
                {sectionStats.map((s, i) => (
                  <div key={i}>
                    {s.label} — {s.booked}/{s.total} spots
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-center gap-3 text-xs">
              <span className={status.className}>{status.label}</span>
              <span className="text-muted-foreground">•</span>
              <span className={signupStatus.className}>Sign-ups: {signupStatus.label}</span>
            </div>
          </div>

          {/* Actions */}
          {isMobile ? (
            <div className="grid grid-cols-3 gap-2 w-full mt-2">
              <Button variant="outline" size="sm" className="h-10" asChild>
                <Link to={`/events/${event.id}/edit`}>Edit</Link>
              </Button>
              <Button variant="outline" size="sm" className="h-10" asChild>
                <Link to={`/events/${event.id}/duplicate`}>Duplicate</Link>
              </Button>
              <Button variant="outline" size="sm" className="h-10" asChild>
                <Link to={`/events/${event.id}/lineup`}>Lineup</Link>
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-3 text-sm">
              <Link 
                to={`/events/${event.id}/edit`}
                className="text-muted-foreground hover:text-foreground"
              >
                Edit
              </Link>
              <Link 
                to={`/events/${event.id}/duplicate`}
                className="text-muted-foreground hover:text-foreground"
              >
                Duplicate
              </Link>
              <Link 
                to={`/events/${event.id}/lineup`}
                className="text-muted-foreground hover:text-foreground"
              >
                Lineup
              </Link>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
