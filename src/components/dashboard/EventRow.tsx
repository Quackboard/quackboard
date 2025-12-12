import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { format, parseISO, isAfter } from 'date-fns';
import { cn } from '@/lib/utils';

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
    bookings: { id: string; cancelled_at: string | null }[];
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
  const sections = parseSections(event.sections_config);
  const activeBookings = event.bookings.filter(b => !b.cancelled_at);
  const totalSlots = sections.reduce((sum, s) => sum + s.slots, 0);
  const filledSlots = activeBookings.length;

  // Status logic
  const getStatus = () => {
    if (event.status === 'draft') {
      return { label: 'Draft', className: 'text-muted-foreground' };
    }
    if (event.status === 'published') {
      if (event.publish_at && isAfter(parseISO(event.publish_at), now)) {
        return { 
          label: `Scheduled — goes live ${formatDateTime(event.publish_at)}`, 
          className: 'text-muted-foreground' 
        };
      }
      return { label: 'Live', className: 'text-green-600' };
    }
    return { label: event.status, className: 'text-muted-foreground' };
  };

  // Signup status logic
  const getSignupStatus = () => {
    if (!event.signup_opens_at || !isAfter(parseISO(event.signup_opens_at), now)) {
      return { label: 'Open', className: 'text-foreground' };
    }
    return { 
      label: `Opens ${formatDateTime(event.signup_opens_at)}`, 
      className: 'text-muted-foreground' 
    };
  };

  const status = getStatus();
  const signupStatus = getSignupStatus();

  // Build sections summary
  const sectionsSummary = sections.map(section => {
    const sectionBookings = activeBookings.filter((_, i) => {
      // Simple approximation - count bookings per section based on slot positions
      // For accurate counts, we'd need slot_position data
      return true;
    });
    return `${section.label} — ${filledSlots}/${totalSlots} spots`;
  }).join(', ');

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
            
            <p className="text-sm text-muted-foreground">{event.venue_name}</p>
            
            {sections.length > 0 && (
              <p className="text-sm text-muted-foreground">
                {sections.map((s, i) => (
                  <span key={i}>
                    {i > 0 && ' • '}
                    {s.label} — {filledSlots}/{totalSlots} spots
                  </span>
                ))}
              </p>
            )}

            <div className="flex items-center gap-3 text-xs">
              <span className={status.className}>{status.label}</span>
              <span className="text-muted-foreground">•</span>
              <span className={signupStatus.className}>Sign-ups: {signupStatus.label}</span>
            </div>
          </div>

          {/* Right: Actions */}
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
              to={`/events/${event.id}/roster`}
              className="text-muted-foreground hover:text-foreground"
            >
              Roster
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
