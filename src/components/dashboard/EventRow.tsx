import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { format, parseISO, isAfter } from 'date-fns';
import { cn, formatTime } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';

interface Section {
  label: string;
  slots: number;
  type?: 'regular' | 'wildcard';
  signup_opens_at?: string;
}

interface EventRowProps {
  event: {
    id: string;
    title: string;
    date: string;
    start_time: string;
    end_time: string;
    venue_name: string;
    sections_config: Section[];
    status: string;
    publish_at: string | null;
    signup_opens_at: string | null;
    bookings: { id: string; slot_position: number; cancelled_at: string | null }[];
  };
  isPast?: boolean;
}

function formatDateTime(dateStr: string): string {
  const date = parseISO(dateStr);
  return format(date, "MMM d 'at' h:mm a");
}

function parseSections(config: unknown): Section[] {
  if (Array.isArray(config)) {
    return config.filter(
      (item): item is Section =>
        typeof item === 'object' &&
        item !== null &&
        typeof item.label === 'string' &&
        typeof item.slots === 'number'
    ).map(item => ({
      ...item,
      type: (item as any).type || undefined,
      signup_opens_at: (item as any).signup_opens_at || undefined,
    }));
  }
  return [];
}

export function EventRow({ event, isPast = false }: EventRowProps) {
  const now = new Date();
  const isMobile = useIsMobile();
  const sections = parseSections(event.sections_config);
  const activeBookings = event.bookings.filter(b => !b.cancelled_at);
  

  // Status logic - status is declared when creating the mic
  const getStatus = () => {
    if (event.status === 'draft') {
      return { label: 'Draft', className: 'text-muted-foreground' };
    }
    if (event.status === 'published') {
      return { label: 'Live', className: 'text-green-500' };
    }
    return { label: event.status, className: 'text-muted-foreground' };
  };

  const status = getStatus();
  const isLive = status.label === 'Live';


  // Signup status logic
  const getSignupStatus = () => {
    // If signup_opens_at is set and in the future, show that time
    if (event.signup_opens_at && isAfter(parseISO(event.signup_opens_at), now)) {
      return { 
        label: `Opens ${formatDateTime(event.signup_opens_at)}`, 
        className: 'text-muted-foreground' 
      };
    }
    // Otherwise sign-ups are open
    return { label: 'Open', className: 'text-foreground' };
  };

  const signupStatus = getSignupStatus();

  // Calculate slot ranges and booking counts per section
  // Determine if wildcard cutoff has passed
  const wildcardSection = sections.find(s => s.type === 'wildcard');
  const wildcardCutoffPassed = wildcardSection?.signup_opens_at
    ? !isAfter(parseISO(wildcardSection.signup_opens_at), now)
    : false;

  const getSectionStats = () => {
    const regularSections = sections.filter(s => s.type !== 'wildcard');
    const totalRegularSlots = regularSections.reduce((sum, s) => sum + s.slots, 0);
    const bookedRegularCount = activeBookings.filter(b => b.slot_position <= totalRegularSlots).length;
    const bookedWildcardCount = activeBookings.filter(b => b.slot_position > totalRegularSlots).length;

    let startSlot = 1;
    return sections.map(section => {
      if (section.type === 'wildcard') {
        // Before cutoff: hide wildcard from stats
        if (!wildcardCutoffPassed) return null;
        const reserved = section.slots || 0;
        const unfilledRegular = totalRegularSlots - bookedRegularCount;
        const dynamicTotal = unfilledRegular + reserved;
        return { label: section.label, booked: bookedWildcardCount, total: dynamicTotal };
      }
      const endSlot = startSlot + section.slots - 1;
      const bookedCount = activeBookings.filter(
        b => b.slot_position >= startSlot && b.slot_position <= endSlot
      ).length;
      // After cutoff: regular section total = booked count (unfilled slots disappeared)
      const total = wildcardCutoffPassed ? bookedCount : section.slots;
      const stats = { label: section.label, booked: bookedCount, total };
      startSlot = endSlot + 1;
      // After cutoff: hide empty regular sections
      if (wildcardCutoffPassed && bookedCount === 0) return null;
      return stats;
    }).filter(Boolean) as { label: string; booked: number; total: number }[];
  };
  const sectionStats = getSectionStats();

  const totalRegularSlots = sections.filter(s => s.type !== 'wildcard').reduce((sum, s) => sum + s.slots, 0);
  const totalShowSpots = totalRegularSlots + (wildcardSection?.slots || 0);

  return (
    <Card className={cn(
      "border-border",
      isPast && "opacity-50"
    )}>
      <CardContent className="py-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          {/* Left: Event Info */}
          <div className="space-y-1.5 min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium text-foreground">
                {format(parseISO(event.date), 'EEE, MMM d')}
              </span>
              <span className="text-muted-foreground">
                {formatTime(event.start_time)} - {formatTime(event.end_time)}
              </span>
            </div>
            
            <p className="font-medium text-foreground">{event.title}</p>
            
            {sectionStats.length > 0 && (
              <div className="text-sm text-muted-foreground space-y-0.5">
                {sectionStats.map((s, i) => (
                  <div key={i}>
                    {s.label} — {s.booked}/{s.total} spots filled
                  </div>
                ))}
              </div>
            )}

            {wildcardSection && !wildcardCutoffPassed && wildcardSection.signup_opens_at && (
              <p className="text-xs text-muted-foreground italic">
                🎲 At least {wildcardSection.slots} wildcard spot{wildcardSection.slots !== 1 ? 's' : ''} opening {formatDateTime(wildcardSection.signup_opens_at)} — {totalShowSpots} total spots on this show
              </p>
            )}

            <div className="flex items-center gap-3 text-xs">
              <span className={status.className}>{status.label}</span>
              <span className="text-muted-foreground">•</span>
              <span className={signupStatus.className}>Sign-ups: {signupStatus.label}</span>
            </div>
          </div>

          {/* Actions */}
          {isMobile ? (
            <div className="grid grid-cols-3 gap-2 w-full mt-2">
              <Button variant="outline" size="sm" className="h-10" asChild>
                <Link to={`/events/${event.id}/edit`}>Edit</Link>
              </Button>
              <Button variant="outline" size="sm" className="h-10" asChild>
                <Link to={`/events/${event.id}/duplicate`}>Duplicate</Link>
              </Button>
              <Button variant="outline" size="sm" className="h-10" asChild>
                <Link to={`/events/${event.id}/lineup`}>Lineup</Link>
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-3 text-sm">
              <Link 
                to={`/events/${event.id}/edit`}
                className="text-muted-foreground hover:text-foreground"
              >
                Edit
              </Link>
              <Link 
                to={`/events/${event.id}/duplicate`}
                className="text-muted-foreground hover:text-foreground"
              >
                Duplicate
              </Link>
              <Link 
                to={`/events/${event.id}/lineup`}
                className="text-muted-foreground hover:text-foreground"
              >
                Lineup
              </Link>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
