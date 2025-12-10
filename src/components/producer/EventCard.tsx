import { Event, Booking, Section } from '@/types/database';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock, MapPin } from 'lucide-react';
import { SlotList } from './SlotList';

interface EventCardProps {
  event: Event;
  bookings: Booking[];
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

export function EventCard({ event, bookings }: EventCardProps) {
  const sections = parseSectionsConfig(event.sections_config);

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-2">
        <CardTitle className="text-xl text-card-foreground">
          {event.title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Clock className="h-4 w-4" />
          <span className="text-sm">
            {formatTime(event.start_time)} - {formatTime(event.end_time)}
          </span>
        </div>
        <div className="flex items-start gap-2 text-muted-foreground">
          <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <div className="text-sm">
            <p className="font-medium text-card-foreground">{event.venue_name}</p>
            <p>{event.venue_address}</p>
          </div>
        </div>
        
        {sections.length > 0 && (
          <SlotList sectionsConfig={sections} bookings={bookings} />
        )}
      </CardContent>
    </Card>
  );
}
