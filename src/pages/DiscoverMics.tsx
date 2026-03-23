import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { format, parseISO, getDay } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { Mic, ChevronDown, ChevronUp, Instagram, ExternalLink } from 'lucide-react';
import { formatTime } from '@/lib/utils';

const TZ = 'America/Los_Angeles';
const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const DAY_INDICES = [1, 2, 3, 4, 5, 6, 0]; // Map label position to JS getDay() value

const DISCOVER_PRODUCER_IDS = [
  '1a0ffb85-e5e2-4c33-8eaa-15ae64f38066',
];

type TimeFilter = 'all' | 'morning' | 'afternoon' | 'evening';
type DayFilter = number | null; // 0-6 or null for all

function getHour(timeStr: string): number {
  const parts = timeStr.split(':');
  return parseInt(parts[0], 10);
}

function getTimeOfDay(timeStr: string): 'morning' | 'afternoon' | 'evening' {
  const h = getHour(timeStr);
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}

export default function DiscoverMics() {
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('all');
  const [dayFilter, setDayFilter] = useState<DayFilter>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const nowLA = useMemo(() => toZonedTime(new Date(), TZ), []);
  const todayStr = format(nowLA, 'yyyy-MM-dd');

  const toggleExpand = (id: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const { data: events } = useQuery({
    queryKey: ['discover-events'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('events')
        .select('id, title, venue_name, venue_address, city, date, start_time, end_time, is_info_only, producer_id, sections_config, description, instagram_url, source_link')
        .eq('status', 'published')
        .gte('date', todayStr)
        .order('date')
        .order('start_time');
      if (error) throw error;
      return data;
    },
  });

  const producerIds = useMemo(() => {
    if (!events) return [];
    return [...new Set(events.map(e => e.producer_id).filter(Boolean))];
  }, [events]);

  const { data: producers } = useQuery({
    queryKey: ['discover-producers', producerIds],
    queryFn: async () => {
      if (producerIds.length === 0) return [];
      const { data, error } = await supabase
        .from('producers')
        .select('id, name, slug')
        .in('id', producerIds);
      if (error) throw error;
      return data;
    },
    enabled: producerIds.length > 0,
  });

  const { data: availability } = useQuery({
    queryKey: ['discover-availability'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('event_availability')
        .select('event_id, total_slots, booked_count');
      if (error) throw error;
      return data;
    },
  });

  const producerMap = useMemo(() => {
    const m = new Map<string, { name: string | null; slug: string | null }>();
    producers?.forEach(p => m.set(p.id, { name: p.name, slug: p.slug }));
    return m;
  }, [producers]);

  const availMap = useMemo(() => {
    const m = new Map<string, { total_slots: number; booked_count: number }>();
    availability?.forEach(a => m.set(a.event_id, a));
    return m;
  }, [availability]);

  // Filter events
  const filtered = useMemo(() => {
    if (!events) return [];

    return events.filter(ev => {
      // Producer allowlist for platform mics
      if (ev.is_info_only === false && !DISCOVER_PRODUCER_IDS.includes(ev.producer_id)) {
        return false;
      }

      // Time of day filter
      if (timeFilter !== 'all' && getTimeOfDay(ev.start_time) !== timeFilter) {
        return false;
      }

      // Day of week filter
      if (dayFilter !== null) {
        const eventDate = parseISO(ev.date);
        if (getDay(eventDate) !== dayFilter) return false;
      }

      return true;
    });
  }, [events, timeFilter, dayFilter]);

  // Group by date
  const grouped = useMemo(() => {
    const map = new Map<string, typeof filtered>();
    filtered.forEach(ev => {
      const list = map.get(ev.date) || [];
      list.push(ev);
      map.set(ev.date, list);
    });
    return map;
  }, [filtered]);

  const timeFilters: { key: TimeFilter; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'morning', label: 'Morning' },
    { key: 'afternoon', label: 'Afternoon' },
    { key: 'evening', label: 'Evening' },
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-5">
          <div className="flex items-center gap-2 mb-1">
            <Mic className="h-5 w-5 text-primary" />
            <h1 className="text-xl font-bold text-foreground">Discover Mics</h1>
          </div>
          <p className="text-muted-foreground text-xs">Find open mics happening near you</p>
        </div>

        {/* Filters */}
        <div className="mb-5 space-y-2">
          {/* Time of day */}
          <div className="flex flex-wrap gap-1.5">
            {timeFilters.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setTimeFilter(key)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  timeFilter === key
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary text-secondary-foreground hover:bg-accent'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Day of week */}
          <div className="flex flex-wrap gap-1.5">
            {DAY_LABELS.map((label, i) => {
              const dayIndex = DAY_INDICES[i];
              return (
                <button
                  key={dayIndex}
                  onClick={() => setDayFilter(dayFilter === dayIndex ? null : dayIndex)}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                    dayFilter === dayIndex
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Event list grouped by date */}
        <div className="space-y-4">
          {filtered.length === 0 && (
            <p className="text-sm text-muted-foreground py-8 text-center">
              No mics found for this filter.
            </p>
          )}

          {[...grouped.entries()].map(([dateStr, dayEvents]) => {
            const [year, month, day] = dateStr.split('-').map(Number);
            const dateObj = new Date(year, month - 1, day);
            const dateHeader = format(dateObj, 'EEEE, MMMM d');
            const isToday = dateStr === todayStr;

            return (
              <div key={dateStr}>
                {/* Sticky date header */}
                <div className="sticky top-0 z-10 bg-background py-2">
                  <div className="flex items-center gap-3">
                    <h2 className="text-sm font-semibold text-foreground whitespace-nowrap">
                      {isToday ? `Today · ${dateHeader}` : dateHeader}
                    </h2>
                    <div className="h-px flex-1 bg-border" />
                  </div>
                </div>

                {/* Compact event cards */}
                <div className="space-y-1.5">
                  {dayEvents.map(ev => {
                    const producer = ev.producer_id ? producerMap.get(ev.producer_id) : null;
                    const avail = availMap.get(ev.id);
                    const isPlatform = ev.is_info_only === false;
                    const spotsAvailable = avail ? avail.total_slots - avail.booked_count > 0 : false;
                    const isExpanded = expanded.has(ev.id);
                    const hasDescription = !!ev.description;
                    const isInfoOnly = ev.is_info_only === true;
                    const cityDisplay = ev.city || '';

                    const cardContent = (
                      <Card className="transition-shadow hover:shadow-md">
                        <CardContent className="px-3 py-2.5">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <h3 className="font-semibold text-foreground text-sm truncate leading-tight">
                                {ev.title}
                              </h3>
                              <p className="text-xs text-muted-foreground mt-0.5 truncate">
                                {formatTime(ev.start_time)} – {formatTime(ev.end_time)}
                                {ev.venue_name && <> · {ev.venue_name}</>}
                                {cityDisplay && <> · {cityDisplay}</>}
                              </p>
                            </div>

                            <div className="flex items-center gap-1 shrink-0">
                              {isPlatform && (
                                <>
                                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                                    On Quackboard
                                  </Badge>
                                  {avail && spotsAvailable && (
                                    <Badge variant="default" className="text-[10px] px-1.5 py-0">
                                      Spots Open
                                    </Badge>
                                  )}
                                </>
                              )}
                              {hasDescription && (
                                <button
                                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleExpand(ev.id); }}
                                  className="p-0.5 rounded hover:bg-accent transition-colors"
                                  aria-label={isExpanded ? 'Collapse details' : 'Expand details'}
                                >
                                  {isExpanded ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Expanded description + links */}
                          {isExpanded && ev.description && (
                            <div className="mt-2 pt-2 border-t border-border">
                              <p className="text-xs text-muted-foreground whitespace-pre-line">{ev.description}</p>
                              {isInfoOnly && (ev.source_link || ev.instagram_url) && (
                                <div className="flex items-center gap-3 mt-2">
                                  {ev.source_link && (
                                    <a
                                      href={ev.source_link}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      onClick={e => e.stopPropagation()}
                                      className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                                    >
                                      <ExternalLink className="h-3 w-3" />
                                      More Info
                                    </a>
                                  )}
                                  {ev.instagram_url && (
                                    <a
                                      href={ev.instagram_url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      onClick={e => e.stopPropagation()}
                                      className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                                    >
                                      <Instagram className="h-3 w-3" />
                                      Instagram
                                    </a>
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );

                    if (producer?.slug) {
                      return (
                        <Link key={ev.id} to={`/producer/${producer.slug}`} className="block">
                          {cardContent}
                        </Link>
                      );
                    }

                    return <div key={ev.id}>{cardContent}</div>;
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
