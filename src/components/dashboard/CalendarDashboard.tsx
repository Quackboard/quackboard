import { useState, useMemo } from 'react';
import { format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths } from 'date-fns';
import { ChevronLeft, ChevronRight, CalendarOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';

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
  const isMobile = useIsMobile();

  const eventsByDate = useMemo(() => {
    const grouped: Record<string, EventWithBookings[]> = {};
    events.forEach(event => {
      const dateToUse = viewType === 'created_date' ? event.created_at : event.date;
      const dateKey = format(parseISO(dateToUse), 'yyyy-MM-dd');
      if (!grouped[dateKey]) grouped[dateKey] = [];
      grouped[dateKey].push(event);
    });
    return grouped;
  }, [events, viewType]);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const monthDays = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const startDate = new Date(monthStart);
  startDate.setDate(startDate.getDate() - startDate.getDay());
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

  // Days in current month that have events (for mobile agenda)
  const agendaDays = useMemo(() => {
    return monthDays
      .filter(day => {
        const dateKey = format(day, 'yyyy-MM-dd');
        return (eventsByDate[dateKey] || []).length > 0;
      });
  }, [monthDays, eventsByDate]);

  const monthHeader = (
    <div className="flex items-center justify-between">
      <h2 className="text-lg font-semibold text-foreground">
        {format(currentMonth, 'MMMM yyyy')}
      </h2>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={() => navigateMonth('prev')}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="sm" onClick={() => navigateMonth('next')}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <div className="space-y-4">
        {monthHeader}
        {agendaDays.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-2">
            <CalendarOff className="h-8 w-8" />
            <p className="text-sm">No mics this month</p>
          </div>
        ) : (
          <div className="space-y-4">
            {agendaDays.map(day => {
              const dateKey = format(day, 'yyyy-MM-dd');
              const dayEvents = eventsByDate[dateKey] || [];
              const isToday = isSameDay(day, new Date());
              return (
                <div key={dateKey}>
                  <div className={cn(
                    "text-sm font-semibold mb-2 px-1",
                    isToday ? "text-primary" : "text-foreground"
                  )}>
                    {format(day, 'EEE, MMM d')}
                    {isToday && <span className="ml-2 text-xs font-normal text-primary">Today</span>}
                  </div>
                  <div className="space-y-2">
                    {dayEvents.map(event => (
                      <div
                        key={event.id}
                        className="p-3 rounded-lg bg-primary/10 border border-primary/20"
                      >
                        <div className="font-medium text-sm text-foreground">
                          {event.title || `Mic on ${format(parseISO(event.date), 'MMM d')}`}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {formatTime(event.start_time)} – {formatTime(event.end_time)} · {event.venue_name}
                        </div>
                        <div className="text-xs mt-1">
                          <span className={cn(
                            getEventStatus(event) === 'Live' ? 'text-green-500' : 'text-muted-foreground'
                          )}>
                            {getEventStatus(event)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {monthHeader}
      <div className="grid grid-cols-7 gap-1">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="p-2 text-center text-sm font-medium text-muted-foreground">
            {day}
          </div>
        ))}
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
              <div className="text-sm font-medium mb-2">{format(day, 'd')}</div>
              <div className="space-y-1">
                {dayEvents.slice(0, 3).map(event => (
                  <div key={event.id} className="text-xs p-1 rounded bg-primary/10 border border-primary/20">
                    <div className="font-medium truncate">
                      {event.title || `Mic on ${format(parseISO(event.date), 'MMM d')}`}
                    </div>
                    <div className="text-muted-foreground">
                      {formatTime(event.start_time)} • {getEventStatus(event)}
                    </div>
                  </div>
                ))}
                {dayEvents.length > 3 && (
                  <div className="text-xs text-muted-foreground">+{dayEvents.length - 3} more</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
