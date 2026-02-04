import { useState, useMemo } from 'react';
import { format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths } from 'date-fns';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface EventWithBookings {
  id: string;
  title: string;
  date: string;
  created_at: string;
  start_time: string;
  end_time: string;
  venue_name: string;
  sections_config: { label: string; slots: number }[];
  status: string;
  publish_at: string | null;
  signup_opens_at: string | null;
  bookings: { id: string; slot_position: number; cancelled_at: string | null }[];
}

interface CalendarDashboardProps {
  events: EventWithBookings[];
  viewType: 'event_date' | 'created_date';
}

export function CalendarDashboard({ events, viewType }: CalendarDashboardProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // Group events by date based on view type
  const eventsByDate = useMemo(() => {
    const grouped: Record<string, EventWithBookings[]> = {};

    events.forEach(event => {
      const dateToUse = viewType === 'created_date' ? event.created_at : event.date;
      const dateKey = format(parseISO(dateToUse), 'yyyy-MM-dd');

      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(event);
    });

    return grouped;
  }, [events, viewType]);

  // Get all days in the current month
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const monthDays = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Add empty cells for days before the first day of the month
  const startDate = new Date(monthStart);
  startDate.setDate(startDate.getDate() - startDate.getDay());

  // Add empty cells for days after the last day of the month
  const endDate = new Date(monthEnd);
  endDate.setDate(endDate.getDate() + (6 - endDate.getDay()));

  const calendarDays = eachDayOfInterval({ start: startDate, end: endDate });

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentMonth(prev =>
      direction === 'next' ? addMonths(prev, 1) : subMonths(prev, 1)
    );
  };

  const formatTime = (time: string): string => {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  const getEventStatus = (event: EventWithBookings): string => {
    if (event.status === 'draft') return 'Draft';
    if (event.status === 'published') return 'Live';
    return event.status;
  };

  return (
    <div className="space-y-4">
      {/* Calendar Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">
          {format(currentMonth, 'MMMM yyyy')}
        </h2>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigateMonth('prev')}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigateMonth('next')}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1">
        {/* Day Headers */}
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="p-2 text-center text-sm font-medium text-muted-foreground">
            {day}
          </div>
        ))}

        {/* Calendar Days */}
        {calendarDays.map(day => {
          const dateKey = format(day, 'yyyy-MM-dd');
          const dayEvents = eventsByDate[dateKey] || [];
          const isCurrentMonth = isSameMonth(day, currentMonth);
          const isToday = isSameDay(day, new Date());

          return (
            <div
              key={day.toISOString()}
              className={cn(
                "min-h-[120px] p-2 border border-border rounded-lg",
                !isCurrentMonth && "bg-muted/30 text-muted-foreground",
                isToday && "ring-2 ring-primary ring-offset-1"
              )}
            >
              <div className="text-sm font-medium mb-2">
                {format(day, 'd')}
              </div>

              {/* Events for this day */}
              <div className="space-y-1">
                {dayEvents.slice(0, 3).map(event => (
                  <div
                    key={event.id}
                    className="text-xs p-1 rounded bg-primary/10 border border-primary/20"
                  >
                    <div className="font-medium truncate">
                      {event.title || `Mic on ${format(parseISO(event.date), 'MMM d')}`}
                    </div>
                    <div className="text-muted-foreground">
                      {formatTime(event.start_time)} • {getEventStatus(event)}
                    </div>
                  </div>
                ))}

                {dayEvents.length > 3 && (
                  <div className="text-xs text-muted-foreground">
                    +{dayEvents.length - 3} more
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <Card className="mt-4">
        <CardContent className="pt-4">
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <CalendarIcon className="h-4 w-4" />
              <span>
                {viewType === 'created_date' ? 'Showing by Created Date' : 'Showing by Event Date'}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
