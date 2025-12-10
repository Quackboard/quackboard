import { Event, Booking, Section } from '@/types/database';
import { Card, CardContent } from '@/components/ui/card';
import { Clock, MapPin } from 'lucide-react';
import { SpotList } from './SpotList';

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

export function EventCard({ event, bookings, producerVenueName, onBookingSuccess }: EventCardProps) {
  const sections = parseSectionsConfig(event.sections_config);
  const showVenue = event.venue_name !== producerVenueName;
  const eventTime = `${formatTime(event.start_time)} - ${formatTime(event.end_time)}`;

  return (
    <Card className="bg-card border-border">
      <CardContent className="pt-4 space-y-2">
        <div className="flex items-center gap-2 text-foreground">
          <Clock className="h-4 w-4" />
          <span className="text-sm font-medium">
            {eventTime}
          </span>
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
        
        {sections.length > 0 && (
          <SpotList 
            sectionsConfig={sections} 
            bookings={bookings} 
            eventId={event.id}
            eventTime={eventTime}
            onBookingSuccess={onBookingSuccess}
          />
        )}
      </CardContent>
    </Card>
  );
}
