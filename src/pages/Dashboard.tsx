import { ProducerLayout } from '@/components/layouts/ProducerLayout';
import { useAuth } from '@/contexts/AuthContext';
import { supabase, SUPABASE_URL_PUBLIC } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { Loader2, Plus, Copy, Check, Calendar, List, ChevronDown } from 'lucide-react';
import { EventRow } from '@/components/dashboard/EventRow';
import { UpcomingEventCard } from '@/components/dashboard/UpcomingEventCard';
import { RecurringSeriesCard } from '@/components/dashboard/RecurringSeriesCard';
import { CalendarDashboard } from '@/components/dashboard/CalendarDashboard';
import { useProducerSlug } from '@/hooks/useProducerSlug';
import { useState, useMemo } from 'react';
import { useToast } from '@/hooks/use-toast';
import { EmbedSection } from '@/components/embed/EmbedSection';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useIsMobile } from '@/hooks/use-mobile';
import { format, parseISO } from 'date-fns';

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
  template_id: string | null;
  bookings: { id: string; slot_position: number; cancelled_at: string | null }[];
}

interface EventAvailability {
  event_id: string;
  total_slots: number;
  booked_count: number;
}

interface TemplateRow {
  id: string;
  title: string;
  series_id: string;
  start_time: string;
  end_time: string;
  recurrence_rule: { days?: number[] } | null;
}

export default function Dashboard() {
  const { user, loading: authLoading } = useAuth();
  const { slug, isLoading: slugLoading } = useProducerSlug();
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [calendarViewType, setCalendarViewType] = useState<'event_date' | 'created_date'>('event_date');
  const [listViewType, setListViewType] = useState<'upcoming' | 'past'>('upcoming');
  const isMobile = useIsMobile();

  const { data: allEvents, isLoading: allEventsLoading } = useQuery({
    queryKey: ['producer-all-events', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('events')
        .select(`
          id, title, date, created_at, start_time, end_time, venue_name,
          sections_config, status, publish_at, signup_opens_at, series_id,
          bookings (id, slot_position, cancelled_at)
        `)
        .eq('producer_id', user!.id)
        .order('date', { ascending: true });
      if (error) throw error;
      return data as EventWithBookings[];
    },
    enabled: !!user?.id && viewMode === 'calendar',
  });

  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const nowTime = now.toTimeString().slice(0, 5);

  // Upcoming events query
  const { data: upcomingEvents, isLoading: upcomingLoading } = useQuery({
    queryKey: ['producer-events-upcoming', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('events')
        .select(`
          id, title, date, created_at, start_time, end_time, venue_name,
          sections_config, status, publish_at, signup_opens_at, series_id,
          bookings (id, slot_position, cancelled_at)
        `)
        .eq('producer_id', user!.id)
        .or(`date.gt.${today},and(date.eq.${today},end_time.gte.${nowTime})`)
        .order('date', { ascending: true });
      if (error) throw error;
      return data as EventWithBookings[];
    },
    enabled: !!user?.id && viewMode === 'list' && listViewType === 'upcoming',
  });

  // Past events query
  const { data: pastEvents, isLoading: pastLoading } = useQuery({
    queryKey: ['producer-events-past', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('events')
        .select(`
          id, title, date, created_at, start_time, end_time, venue_name,
          sections_config, status, publish_at, signup_opens_at, series_id,
          bookings (id, slot_position, cancelled_at)
        `)
        .eq('producer_id', user!.id)
        .or(`date.lt.${today},and(date.eq.${today},end_time.lt.${nowTime})`)
        .order('date', { ascending: false });
      if (error) throw error;
      return data as EventWithBookings[];
    },
    enabled: !!user?.id && viewMode === 'list' && listViewType === 'past',
  });

  // Event templates query for series metadata
  const { data: templates } = useQuery({
    queryKey: ['producer-event-templates', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('event_templates')
        .select('id, title, series_id, start_time, end_time, recurrence_rule')
        .eq('producer_id', user!.id);
      if (error) throw error;
      return data as TemplateRow[];
    },
    enabled: !!user?.id && viewMode === 'list' && listViewType === 'upcoming',
  });

  // Fetch availability from the view for upcoming events
  const upcomingEventIds = upcomingEvents?.map(e => e.id) ?? [];
  const { data: availabilityData } = useQuery({
    queryKey: ['event-availability', upcomingEventIds],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('event_availability')
        .select('event_id, total_slots, booked_count')
        .in('event_id', upcomingEventIds);
      if (error) throw error;
      return data as EventAvailability[];
    },
    enabled: upcomingEventIds.length > 0,
  });

  const availabilityMap = useMemo(() => {
    const map = new Map<string, { total_slots: number; booked_count: number }>();
    availabilityData?.forEach(a => {
      map.set(a.event_id, { total_slots: a.total_slots, booked_count: a.booked_count });
    });
    return map;
  }, [availabilityData]);

  // Build template map by series_id
  const templateMap = useMemo(() => {
    const map = new Map<string, TemplateRow>();
    templates?.forEach(t => map.set(t.series_id, t));
    return map;
  }, [templates]);

  // Categorize upcoming events
  const { happeningNow, openingSoon, recurringGroups, singleGrouped } = useMemo(() => {
    if (!upcomingEvents) return { happeningNow: [], openingSoon: [], recurringGroups: [] as { seriesId: string; template: TemplateRow; events: EventWithBookings[] }[], singleGrouped: [] as { dateLabel: string; events: EventWithBookings[] }[] };

    const currentTime = new Date();
    const currentTimeStr = currentTime.toTimeString().slice(0, 5);
    const todayStr = `${currentTime.getFullYear()}-${String(currentTime.getMonth() + 1).padStart(2, '0')}-${String(currentTime.getDate()).padStart(2, '0')}`;
    const in24h = new Date(currentTime.getTime() + 24 * 60 * 60 * 1000);

    const happeningNowArr: EventWithBookings[] = [];
    const openingSoonArr: EventWithBookings[] = [];
    const remainingArr: EventWithBookings[] = [];

    for (const event of upcomingEvents) {
      const isToday = event.date === todayStr;
      const isNowRunning = isToday && event.start_time <= currentTimeStr && event.end_time > currentTimeStr;

      if (isNowRunning) {
        happeningNowArr.push(event);
        continue;
      }

      // Check opening soon: signup_opens_at within 24h but not yet open
      if (event.signup_opens_at) {
        const opensAt = parseISO(event.signup_opens_at);
        if (opensAt > currentTime && opensAt <= in24h) {
          openingSoonArr.push(event);
        }
      }

      remainingArr.push(event);
    }

    // Split remaining into recurring and single
    const recurringMap = new Map<string, EventWithBookings[]>();
    const singleArr: EventWithBookings[] = [];

    for (const event of remainingArr) {
      if (event.series_id) {
        if (!recurringMap.has(event.series_id)) recurringMap.set(event.series_id, []);
        recurringMap.get(event.series_id)!.push(event);
      } else {
        singleArr.push(event);
      }
    }

    // Build recurring groups with template info
    const recurringGroupsArr = Array.from(recurringMap.entries())
      .map(([seriesId, events]) => {
        const template = templateMap.get(seriesId);
        return {
          seriesId,
          template: template ?? { id: '', title: events[0]?.title ?? 'Untitled', series_id: seriesId, start_time: events[0]?.start_time ?? '', end_time: events[0]?.end_time ?? '', recurrence_rule: null },
          events: events.sort((a, b) => a.date.localeCompare(b.date) || a.start_time.localeCompare(b.start_time)),
        };
      })
      .sort((a, b) => a.template.title.localeCompare(b.template.title));

    // Group single by date
    const dayMap = new Map<string, EventWithBookings[]>();
    for (const event of singleArr) {
      if (!dayMap.has(event.date)) dayMap.set(event.date, []);
      dayMap.get(event.date)!.push(event);
    }

    const singleGroupedArr = Array.from(dayMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, events]) => ({
        dateLabel: format(parseISO(date), 'EEEE, MMMM d'),
        events: events.sort((a, b) => a.start_time.localeCompare(b.start_time)),
      }));

    return { happeningNow: happeningNowArr, openingSoon: openingSoonArr, recurringGroups: recurringGroupsArr, singleGrouped: singleGroupedArr };
  }, [upcomingEvents, templateMap]);

  const displaySlug = slug || user?.id;
  const producerPageUrl = `/producer/${displaySlug}`;
  const fullPageUrl = `${window.location.origin}${producerPageUrl}`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(fullPageUrl);
      setCopied(true);
      toast({ title: 'Link copied to clipboard' });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ title: 'Failed to copy link', variant: 'destructive' });
    }
  };

  const eventsLoading = listViewType === 'upcoming' ? upcomingLoading : pastLoading;
  const hasNoUpcomingEvents = happeningNow.length === 0 && openingSoon.length === 0 && recurringGroups.length === 0 && singleGrouped.length === 0;

  return (
    <ProducerLayout>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <h1 className="text-2xl font-semibold text-foreground">Dashboard</h1>
        <Button asChild size="sm" className="w-full sm:w-auto">
          <Link to="/create">
            <Plus className="h-4 w-4 mr-1" />
            Create Mic
          </Link>
        </Button>
      </div>

      {/* Your Mics Section */}
      <section>
        <h2 className="text-lg font-medium text-foreground mb-4">Your Mics</h2>

        {/* View Toggle */}
        <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as 'list' | 'calendar')} className="mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <TabsList className="w-full sm:w-auto">
              <TabsTrigger value="list" className="flex-1 sm:flex-none flex items-center justify-center gap-2">
                <List className="h-4 w-4" />
                <span className="hidden xs:inline">List</span>
              </TabsTrigger>
              <TabsTrigger value="calendar" className="flex-1 sm:flex-none flex items-center justify-center gap-2">
                <Calendar className="h-4 w-4" />
                <span className="hidden xs:inline">Calendar</span>
              </TabsTrigger>
            </TabsList>

            {viewMode === 'list' && (
              <Tabs value={listViewType} onValueChange={(value) => setListViewType(value as 'upcoming' | 'past')}>
                <TabsList className="w-full sm:w-auto">
                  <TabsTrigger value="upcoming" className="flex-1 sm:flex-none text-xs sm:text-sm">Upcoming</TabsTrigger>
                  <TabsTrigger value="past" className="flex-1 sm:flex-none text-xs sm:text-sm">Past</TabsTrigger>
                </TabsList>
              </Tabs>
            )}

            {viewMode === 'calendar' && (
              <Tabs value={calendarViewType} onValueChange={(value) => setCalendarViewType(value as 'event_date' | 'created_date')}>
                <TabsList className="w-full sm:w-auto">
                  <TabsTrigger value="event_date" className="flex-1 sm:flex-none text-xs sm:text-sm">Event Date</TabsTrigger>
                  <TabsTrigger value="created_date" className="flex-1 sm:flex-none text-xs sm:text-sm">Created</TabsTrigger>
                </TabsList>
              </Tabs>
            )}
          </div>
        </Tabs>

        {/* Loading State */}
        {eventsLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {/* Events Display */}
        {!eventsLoading && viewMode === 'list' && (
          <div>
            {listViewType === 'upcoming' ? (
              /* ===== UPCOMING TAB ===== */
              <div className="space-y-8">
                {/* Happening Now */}
                {happeningNow.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-[hsl(var(--status-live))] uppercase tracking-wide mb-3">
                      Happening Now
                    </h3>
                    <div className="space-y-3">
                      {happeningNow.map(event => (
                        <UpcomingEventCard
                          key={event.id}
                          event={event}
                          availability={availabilityMap.get(event.id) ?? null}
                          isHappeningNow
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Opening Soon */}
                {openingSoon.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-[hsl(var(--status-draft))] uppercase tracking-wide mb-3">
                      Opening Soon
                    </h3>
                    <div className="space-y-3">
                      {openingSoon.map(event => (
                        <UpcomingEventCard
                          key={event.id}
                          event={event}
                          availability={availabilityMap.get(event.id) ?? null}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Recurring Mics */}
                {recurringGroups.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide mb-3">
                      Recurring Mics
                    </h3>
                    <div className="space-y-3">
                      {recurringGroups.map(group => (
                        <RecurringSeriesCard
                          key={group.seriesId}
                          template={group.template}
                          events={group.events}
                          availabilityMap={availabilityMap}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Single Mics */}
                {singleGrouped.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide mb-3">
                      Single Mics
                    </h3>
                    {singleGrouped.map(group => (
                      <div key={group.dateLabel} className="mb-4">
                        <h4 className="text-sm font-bold text-foreground mb-3">{group.dateLabel}</h4>
                        <div className="space-y-3">
                          {group.events.map(event => (
                            <UpcomingEventCard
                              key={event.id}
                              event={event}
                              availability={availabilityMap.get(event.id) ?? null}
                            />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Empty state — only if truly nothing */}
                {hasNoUpcomingEvents && (
                  <div className="text-center py-16">
                    <p className="text-muted-foreground mb-4">No upcoming mics</p>
                    <Button asChild>
                      <Link to="/create">
                        <Plus className="h-4 w-4 mr-1" />
                        Create a mic
                      </Link>
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              /* ===== PAST TAB — unchanged ===== */
              <div className="space-y-3">
                {(pastEvents?.length ?? 0) === 0 ? (
                  <div className="text-center py-16">
                    <p className="text-muted-foreground mb-4">No past mics</p>
                  </div>
                ) : (
                  (pastEvents || []).map(event => (
                    <EventRow key={event.id} event={event} isPast />
                  ))
                )}
              </div>
            )}
          </div>
        )}

        {/* Calendar view */}
        {!allEventsLoading && viewMode === 'calendar' && allEvents && (
          <CalendarDashboard events={allEvents} viewType={calendarViewType} />
        )}

        {(viewMode === 'calendar' && allEventsLoading) && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}
      </section>

      {/* Share & Embed Section (Collapsible) */}
      {(slugLoading || authLoading) ? (
        <div className="mt-8 h-24 rounded-lg border border-border bg-muted/20 animate-pulse" />
      ) : displaySlug ? (
        <Collapsible defaultOpen={!isMobile} className="mt-8">
          <CollapsibleTrigger className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors w-full group">
            <ChevronDown className="h-4 w-4 transition-transform group-data-[state=closed]:-rotate-90" />
            Share & Embed
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-4 space-y-6">
            <div className="p-4 rounded-lg border border-border bg-muted/30">
              <p className="text-sm font-medium text-foreground mb-2">Your Page</p>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <code className="flex-1 text-sm text-muted-foreground bg-background px-3 py-2 rounded border border-border truncate">
                  {fullPageUrl.replace('https://', '').replace('http://', '')}
                </code>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopyLink}
                  className="shrink-0 w-full sm:w-auto"
                >
                  {copied ? (
                    <>
                      <Check className="h-4 w-4 mr-1" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4 mr-1" />
                      Copy Link
                    </>
                  )}
                </Button>
              </div>
            </div>

            <EmbedSection
              producerSlug={displaySlug}
              supabaseUrl={SUPABASE_URL_PUBLIC}
            />
          </CollapsibleContent>
        </Collapsible>
      ) : null}
    </ProducerLayout>
  );
}
