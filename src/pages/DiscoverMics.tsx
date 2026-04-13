import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { format, parseISO, addDays } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { Mic, ChevronDown, ChevronUp, Instagram, ExternalLink, ArrowRight } from 'lucide-react';
import ListMicSheet from '@/components/discover/ListMicSheet';
import { formatTime } from '@/lib/utils';

const TZ = 'America/Los_Angeles';

type TimeFilter = 'all' | 'morning' | 'afternoon' | 'evening';

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
  const [dayFilter, setDayFilter] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const nowLA = useMemo(() => toZonedTime(new Date(), TZ), []);
  const todayStr = format(nowLA, 'yyyy-MM-dd');

  // Rolling 7-day window
  const rollingDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = addDays(nowLA, i);
      return {
        dateStr: format(d, 'yyyy-MM-dd'),
        label: format(d, 'EEE M/d'), // e.g. "Mon 4/14"
      };
    });
  }, [nowLA]);

  const startDate = rollingDays[0].dateStr;
  const endDate = rollingDays[6].dateStr;

  const toggleExpand = (id: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const { data: events } = useQuery({
    queryKey: ['discover-events', startDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('events')
        .select('id, title, venue_name, venue_address, city, date, start_time, end_time, is_info_only, producer_id, sections_config, description, instagram_url, source_link')
        .eq('status', 'published')
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date')
        .order('start_time');
      if (error) throw error;
      return data;
    },
  });

  const producerIds = useMemo(() => {
    if (!events) return [];
    return [...new Set(events.map(e => e.producer_id).filter(Boolean))] as string[];
  }, [events]);

  const { data: accountsData } = useQuery({
    queryKey: ['discover-accounts', producerIds],
    queryFn: async () => {
      if (producerIds.length === 0) return [];
      const { data, error } = await supabase.rpc('get_discoverable_producers', {
        producer_ids: producerIds
      } as any);
      if (error) throw error;
      return (data as any[]) || [];
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

  // Map producer_id (user_id) -> account info
  const accountMap = useMemo(() => {
    const m = new Map<string, { slug: string; discoverable: boolean | null; account_name: string }>();
    accountsData?.forEach(entry => {
      if (entry.account) {
        m.set(entry.user_id, entry.account);
      }
    });
    return m;
  }, [accountsData]);

  const availMap = useMemo(() => {
    const m = new Map<string, { total_slots: number; booked_count: number }>();
    availability?.forEach(a => {
      if (a.event_id) m.set(a.event_id, { total_slots: a.total_slots ?? 0, booked_count: a.booked_count ?? 0 });
    });
    return m;
  }, [availability]);

  // Filter events
  const filtered = useMemo(() => {
    if (!events) return [];

    return events.filter(ev => {
      // Only show platform mics from discoverable accounts
      if (ev.is_info_only === false) {
        const account = ev.producer_id ? accountMap.get(ev.producer_id) : null;
        if (!account?.discoverable) return false;
      }

      // Time of day filter
      if (timeFilter !== 'all' && getTimeOfDay(ev.start_time) !== timeFilter) {
        return false;
      }

      // Day filter (exact date match)
      if (dayFilter !== null && ev.date !== dayFilter) {
        return false;
      }

      return true;
    });
  }, [events, timeFilter, dayFilter, accountMap]);

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
      {/* Top branding bar */}
      <header className="border-b border-border bg-background sticky top-0 z-50">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/" className="inline-flex items-center gap-1.5 hover:opacity-80 transition-opacity">
            <img src="/favicon.png" alt="Quackboard" className="h-5 w-5" />
            <span className="text-lg font-bold font-outfit text-foreground">Quackboard</span>
          </Link>
          <ListMicSheet />
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-5">
          <div className="flex items-center gap-2 mb-1">
            <Mic className="h-5 w-5 text-primary" />
            <h1 className="text-xl font-bold text-foreground">Browse Mics</h1>
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

          {/* Day filter with dates */}
          <div className="flex flex-wrap gap-1.5">
            {rollingDays.map(({ dateStr, label }) => (
              <button
                key={dateStr}
                onClick={() => setDayFilter(dayFilter === dateStr ? null : dateStr)}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                  dayFilter === dateStr
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                }`}
              >
                {label}
              </button>
            ))}
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

                {/* Event cards */}
                <div className="space-y-1.5">
                  {dayEvents.map(ev => {
                    const account = ev.producer_id ? accountMap.get(ev.producer_id) : null;
                    const avail = availMap.get(ev.id);
                    const isPlatform = ev.is_info_only === false;
                    const spotsRemaining = avail ? avail.total_slots - avail.booked_count : 0;
                    const spotsAvailable = spotsRemaining > 0;
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

                          {/* Badges + CTA row for platform mics */}
                          {isPlatform && (
                            <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                                On Quackboard
                              </Badge>
                              {avail && spotsAvailable && (
                                <Badge variant="default" className="text-[10px] px-1.5 py-0">
                                  {spotsRemaining} {spotsRemaining === 1 ? 'spot' : 'spots'} open
                                </Badge>
                              )}
                              {account?.slug && spotsAvailable && (
                                <Button
                                  variant="default"
                                  size="sm"
                                  className="h-5 text-[10px] px-2 ml-auto"
                                  asChild
                                >
                                  <Link
                                    to={`/${account.slug}`}
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    Grab a Spot
                                    <ArrowRight className="h-3 w-3 ml-0.5" />
                                  </Link>
                                </Button>
                              )}
                            </div>
                          )}

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

                    if (account?.slug) {
                      return (
                        <Link key={ev.id} to={`/${account.slug}`} className="block">
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
