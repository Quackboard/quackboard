import { ProducerLayout } from '@/components/layouts/ProducerLayout';
import { useAuth } from '@/contexts/AuthContext';
import { supabase, SUPABASE_URL_PUBLIC } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { Loader2, Plus, ExternalLink, Copy, Check, Calendar, List, ChevronDown } from 'lucide-react';
import { EventRow } from '@/components/dashboard/EventRow';
import { CalendarDashboard } from '@/components/dashboard/CalendarDashboard';
import { useProducerSlug } from '@/hooks/useProducerSlug';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { EmbedSection } from '@/components/embed/EmbedSection';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
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

export default function Dashboard() {
  const { user, loading: authLoading } = useAuth();
  const { slug, isLoading: slugLoading } = useProducerSlug();
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  // State for toggling between the main 'list' view and 'calendar' layout
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  // Specific view perspective for the calendar: performance date vs creation date
  const [calendarViewType, setCalendarViewType] = useState<'event_date' | 'created_date'>('event_date');
  // Specific view perspective for the list: upcoming or past events
  const [listViewType, setListViewType] = useState<'upcoming' | 'past'>('upcoming');
  const isMobile = useIsMobile();

  const { data: allEvents, isLoading: allEventsLoading } = useQuery({
    queryKey: ['producer-all-events', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('events')
        .select(`
          id,
          title,
          date,
          created_at,
          start_time,
          end_time,
          venue_name,
          sections_config,
          status,
          publish_at,
          signup_opens_at,
          bookings (id, slot_position, cancelled_at)
        `)
        .eq('producer_id', user!.id)
        .order('date', { ascending: true });

      if (error) throw error;
      return data as EventWithBookings[];
    },
    enabled: !!user?.id && viewMode === 'calendar',
  });

  const today = new Date().toISOString().split('T')[0];

  const { data: events, isLoading: eventsLoading } = useQuery({
    queryKey: ['producer-events', user?.id, listViewType],
    queryFn: async () => {
      let query = supabase
        .from('events')
        .select(`
          id,
          title,
          date,
          created_at,
          start_time,
          end_time,
          venue_name,
          sections_config,
          status,
          publish_at,
          signup_opens_at,
          bookings (id, slot_position, cancelled_at)
        `)
        .eq('producer_id', user!.id);

      // Use date+end_time combined to correctly classify events:
      // An event that ends at 14:00 today is already past, not upcoming
      const nowISO = new Date().toISOString();
      const nowTime = new Date().toTimeString().slice(0, 5); // HH:mm
      if (listViewType === 'upcoming') {
        // Upcoming: future dates OR today with end_time after now
        query = query
          .or(`date.gt.${today},and(date.eq.${today},end_time.gte.${nowTime})`)
          .order('date', { ascending: true });
      } else {
        // Past: past dates OR today with end_time before now
        query = query
          .or(`date.lt.${today},and(date.eq.${today},end_time.lt.${nowTime})`)
          .order('date', { ascending: false });
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as EventWithBookings[];
    },
    enabled: !!user?.id && viewMode === 'list',
  });



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

  return (
    <ProducerLayout>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <h1 className="text-2xl font-semibold text-foreground">Dashboard</h1>
        <div className="flex items-center gap-3">
          <a
            href={producerPageUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:flex text-sm text-muted-foreground hover:text-foreground items-center gap-1"
          >
            View My Page
            <ExternalLink className="h-3 w-3" />
          </a>
          <Button asChild size="sm" className="w-full sm:w-auto">
            <Link to="/create">
              <Plus className="h-4 w-4 mr-1" />
              Create Mic
            </Link>
          </Button>
        </div>
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

            {/* Sub-navigation for list: Upcoming vs Past */}
            {viewMode === 'list' && (
              <Tabs value={listViewType} onValueChange={(value) => setListViewType(value as 'upcoming' | 'past')}>
                <TabsList className="w-full sm:w-auto">
                  <TabsTrigger value="upcoming" className="flex-1 sm:flex-none text-xs sm:text-sm">Upcoming</TabsTrigger>
                  <TabsTrigger value="past" className="flex-1 sm:flex-none text-xs sm:text-sm">Past</TabsTrigger>
                </TabsList>
              </Tabs>
            )}

            {/* Sub-navigation: Only show 'Event Date' vs 'Created' toggle when in Calendar mode to avoid UI clutter */}
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
        {!(eventsLoading || (viewMode === 'calendar' && allEventsLoading)) && (events || allEvents) && (
          <div>
            {viewMode === 'list' ? (
              <div className="space-y-3">
                {(events?.length ?? 0) === 0 ? (
                  <div className="text-center py-16">
                    <p className="text-muted-foreground mb-4">
                      {listViewType === 'upcoming' ? 'No upcoming mics' : 'No past mics'}
                    </p>
                    {listViewType === 'upcoming' && (
                      <Button asChild>
                        <Link to="/create">
                          <Plus className="h-4 w-4 mr-1" />
                          Create a mic
                        </Link>
                      </Button>
                    )}
                  </div>
                ) : (
                  (events || []).map(event => (
                    <EventRow key={event.id} event={event} isPast={listViewType === 'past'} />
                  ))
                )}
              </div>
            ) : (
              <CalendarDashboard events={allEvents || []} viewType={calendarViewType} />
            )}
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
