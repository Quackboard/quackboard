import { Event, Booking, Section } from '@/types/database';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, MapPin } from 'lucide-react';
import { SpotList } from './SpotList';
import { parseISO, isAfter, format } from 'date-fns';

interface EventCardProps {
  event: Event;
  bookings: Booking[];
  producerVenueName?: string | null;
  onBookingSuccess: () => void;
  status: 'upcoming' | 'active' | 'past';
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
  
  // If signup_opens_at is set and in the future
  if (event.signup_opens_at && isAfter(parseISO(event.signup_opens_at), now)) {
    return { label: `Sign-ups open ${formatDateTime(event.signup_opens_at)}`, isOpen: false };
  }
  // If signup_opens_at is null but publish_at is in the future
  if (!event.signup_opens_at && event.publish_at && isAfter(parseISO(event.publish_at), now)) {
    return { label: `Sign-ups open ${formatDateTime(event.publish_at)}`, isOpen: false };
  }
  // Otherwise sign-ups are open
  return { label: '', isOpen: true };
}

export function EventCard({ event, bookings, producerVenueName, onBookingSuccess, status }: EventCardProps) {
  const sections = parseSectionsConfig(event.sections_config);
  const showVenue = event.venue_name !== producerVenueName;
  const eventTime = `${formatTime(event.start_time)} - ${formatTime(event.end_time)}`;
  const signupStatus = getSignupStatus(event);

  const getStatusBadge = () => {
    switch (status) {
      case 'active':
        return <Badge variant="default" className="bg-green-500 hover:bg-green-500">Live</Badge>;
      case 'upcoming':
        return <Badge variant="outline" className="text-blue-500 border-blue-500">Upcoming</Badge>;
      case 'past':
        return <Badge variant="secondary">Past</Badge>;
      default:
        return null;
    }
  };

  return (
    <Card className="bg-card border-border">
      <CardContent className="pt-4 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-foreground">
            <Clock className="h-4 w-4" />
            <span className="text-sm font-medium">
              {eventTime}
            </span>
          </div>
          {getStatusBadge()}
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
          <p className="text-sm text-muted-foreground">{signupStatus.label}</p>
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
      </CardContent>
    </Card>
  );
}
