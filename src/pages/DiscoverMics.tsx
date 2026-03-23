import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { format, parseISO, addHours, isAfter, isBefore, addDays, getDay } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { MapPin, Clock, Mic, CalendarDays, ChevronDown, ChevronUp, Instagram, ExternalLink } from 'lucide-react';

const TZ = 'America/Los_Angeles';
const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// Allowlisted producer IDs for platform (is_info_only=false) mics on Discover
const DISCOVER_PRODUCER_IDS = [
  '1a0ffb85-e5e2-4c33-8eaa-15ae64f38066', // Seven Minutes in Heaven
];

type FilterMode = 'all' | 'today' | 'starting-soon' | string;

export default function DiscoverMics() {
  const [filter, setFilter] = useState<FilterMode>('all');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const nowLA = useMemo(() => toZonedTime(new Date(), TZ), []);
  const todayStr = format(nowLA, 'yyyy-MM-dd');
  const tomorrowStr = format(addDays(nowLA, 1), 'yyyy-MM-dd');

  const toggleExpand = (id: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  // Fetch published events with date >= today
  const { data: events } = useQuery({
    queryKey: ['discover-events'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('events')
        .select('id, title, venue_name, venue_address, date, start_time, end_time, is_info_only, producer_id, sections_config, description, instagram_url, source_link')
        .eq('status', 'published')
        .gte('date', todayStr)
        .order('date')
        .order('start_time');
      if (error) throw error;
      return data;
    },
  });

  // Fetch producer slugs/names for linking
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

  // Fetch availability from view
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

  // Apply filters
  const filtered = useMemo(() => {
    if (!events) return [];

    return events.filter(ev => {
      // For platform mics, only show allowlisted producers
      if (ev.is_info_only === false && !DISCOVER_PRODUCER_IDS.includes(ev.producer_id)) {
        return false;
      }

      if (filter === 'all') return true;

      if (filter === 'today') {
        return ev.date === todayStr;
      }

      if (filter === 'starting-soon') {
        if (ev.date !== todayStr && ev.date !== tomorrowStr) return false;
        const eventDateTime = parseISO(`${ev.date}T${ev.start_time}`);
        const eventLA = toZonedTime(eventDateTime, TZ);
        const twoHoursFromNow = addHours(nowLA, 2);
        return isAfter(eventLA, nowLA) && isBefore(eventLA, twoHoursFromNow);
      }

      // Day of week filter
      const dayNum = parseInt(filter, 10);
      if (!isNaN(dayNum)) {
        const eventDate = parseISO(ev.date);
        return getDay(eventDate) === dayNum;
      }

      return true;
    });
  }, [events, filter, todayStr, tomorrowStr, nowLA]);

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-2">
            <Mic className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold text-foreground">Discover Mics</h1>
          </div>
          <p className="text-muted-foreground text-sm">Find open mics happening near you</p>
        </div>

        {/* Filters */}
        <div className="mb-6 space-y-3">
          <div className="flex flex-wrap gap-2">
            {(['all', 'today', 'starting-soon'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  filter === f
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary text-secondary-foreground hover:bg-accent'
                }`}
              >
                {f === 'all' ? 'All' : f === 'today' ? 'Today' : 'Starting Soon'}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap gap-1.5">
            {DAY_LABELS.map((label, i) => (
              <button
                key={i}
                onClick={() => setFilter(filter === String(i) ? 'all' : String(i))}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                  filter === String(i)
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Event list */}
        <div className="space-y-3">
          {filtered.length === 0 && (
            <p className="text-sm text-muted-foreground py-8 text-center">
              No mics found for this filter.
            </p>
          )}

          {filtered.map(ev => {
            const producer = ev.producer_id ? producerMap.get(ev.producer_id) : null;
            const avail = availMap.get(ev.id);
            const isPlatform = ev.is_info_only === false;
            const spotsAvailable = avail ? avail.total_slots - avail.booked_count > 0 : false;
            const eventDate = parseISO(ev.date);
            const dayLabel = format(eventDate, 'EEE, MMM d');
            const isExpanded = expanded.has(ev.id);
            const hasDescription = !!ev.description;
            const isInfoOnly = ev.is_info_only === true;

            const cardContent = (
              <Card className="transition-shadow hover:shadow-md">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold text-foreground text-sm truncate">
                        {ev.title}
                      </h3>
                      <div className="flex items-center gap-1.5 mt-1 text-xs text-muted-foreground">
                        <MapPin className="h-3 w-3 shrink-0" />
                        <span className="truncate">{ev.venue_name}</span>
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5 text-xs text-muted-foreground">
                        <CalendarDays className="h-3 w-3 shrink-0" />
                        <span>{dayLabel}</span>
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3 shrink-0" />
                        <span>{ev.start_time.slice(0, 5)} – {ev.end_time.slice(0, 5)}</span>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1 shrink-0">
                      {isPlatform && (
                        <>
                          <Badge variant="secondary" className="text-[10px]">
                            On Quackboard
                          </Badge>
                          {avail && spotsAvailable && (
                            <Badge variant="default" className="text-[10px]">
                              Spots Open
                            </Badge>
                          )}
                        </>
                      )}
                      {hasDescription && (
                        <button
                          onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleExpand(ev.id); }}
                          className="p-1 rounded hover:bg-accent transition-colors"
                          aria-label={isExpanded ? 'Collapse details' : 'Expand details'}
                        >
                          {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Expanded description + links */}
                  {isExpanded && ev.description && (
                    <div className="mt-3 pt-3 border-t border-border">
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

            // Link to producer page if slug exists
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
    </div>
  );
}
