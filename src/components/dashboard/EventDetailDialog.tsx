import { format, parseISO, isAfter } from 'date-fns';
import { Clock, MapPin, Info, Edit, Copy, List } from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn, formatTime } from '@/lib/utils';
import { activeBookingsList } from '@/lib/eventRowActiveBookings';

interface EventWithBookings {
  id: string;
  title: string;
  date: string;
  start_time: string;
  end_time: string;
  venue_name: string;
  sections_config: { label: string; slots: number }[];
  status: string;
  publish_at: string | null;
  bookings: { id: string; slot_position: number; cancelled_at: string | null }[];
}

interface EventDetailDialogProps {
  event: EventWithBookings | null;
  isOpen: boolean;
  onClose: () => void;
  getEventStatus: (event: EventWithBookings) => string;
}

export function EventDetailDialog({ event, isOpen, onClose, getEventStatus }: EventDetailDialogProps) {
  if (!event) return null;

  const status = getEventStatus(event);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogDescription className="sr-only">
          Event details for {event.title}
        </DialogDescription>
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="secondary" className={cn(
              status === 'Live' ? 'bg-green-500/10 text-green-500 hover:bg-green-500/10' :
              status === 'Coming Live' ? 'bg-blue-500/10 text-blue-500 hover:bg-blue-500/10' :
              'bg-muted/10 text-muted-foreground hover:bg-muted/10'
            )}>
              {status}
            </Badge>
          </div>
          <DialogTitle className="text-xl font-bold">
            {event.title || `Mic on ${format(parseISO(event.date), 'MMM d')}`}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="flex items-start gap-3 text-sm">
            <Clock className="h-4 w-4 mt-0.5 text-muted-foreground" />
            <div>
              <p className="font-medium">{format(parseISO(event.date), 'EEEE, MMMM d')}</p>
              <p className="text-muted-foreground font-medium">{formatTime(event.start_time)} – {formatTime(event.end_time)}</p>
            </div>
          </div>

          <div className="flex items-start gap-3 text-sm">
            <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground" />
            <div>
              <p className="font-medium">{event.venue_name}</p>
            </div>
          </div>

          <div className="flex items-start gap-3 text-sm">
            <Info className="h-4 w-4 mt-0.5 text-muted-foreground" />
            <div>
              <p className="font-medium">Bookings</p>
              <p className="text-muted-foreground">
                {activeBookingsList(event.bookings).length} spots filled out of {event.sections_config.reduce((acc, s) => acc + s.slots, 0)} total
              </p>
            </div>
          </div>
        </div>

        <DialogFooter className="flex flex-col sm:flex-row gap-2">
          <Button variant="outline" className="w-full sm:w-auto" asChild>
            <Link to={`/events/${event.id}/edit`}>
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Link>
          </Button>
          <Button variant="outline" className="w-full sm:w-auto" asChild>
            <Link to={`/events/${event.id}/duplicate`}>
              <Copy className="h-4 w-4 mr-2" />
              Duplicate
            </Link>
          </Button>
          <Button className="w-full sm:w-auto" asChild>
            <Link to={`/events/${event.id}/lineup`}>
              <List className="h-4 w-4 mr-2" />
              Lineup
            </Link>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}