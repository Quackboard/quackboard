import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, MoreVertical, Trash2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { formatTime } from '@/lib/utils';
import { getSignupStatus } from '@/lib/signup-status';
import { format, parseISO } from 'date-fns';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const DAY_ABBR = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

interface SeriesEvent {
  id: string;
  title: string;
  date: string;
  start_time: string;
  end_time: string;
  signup_opens_at: string | null;
}

interface TemplateInfo {
  title: string;
  start_time: string | null;
  end_time: string | null;
  recurrence_rule: { days?: number[] } | null;
}

interface RecurringSeriesCardProps {
  template: TemplateInfo;
  events: SeriesEvent[];
  availabilityMap: Map<string, { total_slots: number; booked_count: number }>;
  onDeleteEvent?: (eventId: string) => Promise<void>;
}

export function RecurringSeriesCard({ template, events, availabilityMap, onDeleteEvent }: RecurringSeriesCardProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Build subtitle parts
  const daysStr = useMemo(() => {
    const days = template.recurrence_rule?.days;
    if (!days || !Array.isArray(days) || days.length === 0) return null;
    return days.sort((a, b) => a - b).map(d => DAY_ABBR[d] ?? '').filter(Boolean).join(', ');
  }, [template.recurrence_rule]);

  const timeStr = useMemo(() => {
    if (!template.start_time || !template.end_time) return null;
    return `${formatTime(template.start_time)} – ${formatTime(template.end_time)}`;
  }, [template.start_time, template.end_time]);

  const subtitle = [daysStr, timeStr, `${events.length} upcoming show${events.length !== 1 ? 's' : ''}`]
    .filter(Boolean)
    .join(' · ');

  // Group events by date for expanded view
  const groupedByDate = useMemo(() => {
    const map = new Map<string, SeriesEvent[]>();
    for (const event of events) {
      if (!map.has(event.date)) map.set(event.date, []);
      map.get(event.date)!.push(event);
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, evts]) => ({
        dateLabel: format(parseISO(date), 'EEEE, MMMM d'),
        events: evts.sort((a, b) => a.start_time.localeCompare(b.start_time)),
      }));
  }, [events]);

  return (
    <Card className="border-border">
      <CardContent className="p-0">
        {/* Collapsed header — always visible */}
        <button
          type="button"
          className="w-full flex items-center gap-3 p-4 text-left hover:bg-muted/30 transition-colors rounded-lg"
          onClick={() => setIsOpen(prev => !prev)}
        >
          <ChevronRight
            className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 ${isOpen ? 'rotate-90' : ''}`}
          />
          <div className="flex-1 min-w-0">
            <p className="font-bold text-foreground truncate">{template.title}</p>
            <p className="text-sm text-muted-foreground truncate">{subtitle}</p>
          </div>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span
                  onClick={(e) => e.stopPropagation()}
                  className="shrink-0"
                >
                  <Button variant="outline" size="sm" disabled className="opacity-50 cursor-not-allowed">
                    Edit Series
                  </Button>
                </span>
              </TooltipTrigger>
              <TooltipContent>Coming soon</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </button>

        {/* Expanded content */}
        {isOpen && (
          <div className="max-h-[400px] overflow-y-auto border-t border-border">
            {groupedByDate.map(group => (
              <div key={group.dateLabel}>
                {/* Sticky date header */}
                <div className="sticky top-0 z-10 bg-background border-b border-border px-4 py-2">
                  <p className="text-sm font-bold text-foreground">{group.dateLabel}</p>
                </div>
                {/* Instance rows */}
                {group.events.map(event => (
                  <InstanceRow
                    key={event.id}
                    event={event}
                    availability={availabilityMap.get(event.id) ?? null}
                    onDelete={onDeleteEvent}
                  />
                ))}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function InstanceRow({
  event,
  availability,
  onDelete,
}: {
  event: SeriesEvent;
  availability: { total_slots: number; booked_count: number } | null;
  onDelete?: (eventId: string) => Promise<void>;
}) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const isMobile = useIsMobile();
  const totalSlots = availability?.total_slots ?? 0;
  const bookedCount = availability?.booked_count ?? 0;
  const spotsAvailable = Math.max(0, totalSlots - bookedCount);
  const isFull = spotsAvailable === 0 && totalSlots > 0;
  const signup = getSignupStatus(event.signup_opens_at);

  return (
    <div className="flex items-center gap-3 px-4 py-2.5 border-b border-border last:border-b-0 hover:bg-muted/20 transition-colors">
      {/* Time */}
      <span className="font-bold text-sm text-foreground whitespace-nowrap">
        {formatTime(event.start_time)} – {formatTime(event.end_time)}
      </span>

      {/* Spots */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          {isFull ? (
            <span className="text-sm font-bold text-destructive">Full</span>
          ) : (
            <span className="text-sm font-medium text-foreground">
              {spotsAvailable} spot{spotsAvailable !== 1 ? 's' : ''} available
            </span>
          )}
          <span className="text-xs text-muted-foreground">
            {bookedCount}/{totalSlots} filled
          </span>
        </div>
      </div>

      {/* Signup pill */}
      <div className="shrink-0">
        {signup.type === 'open' && (
          <Badge variant="outline" className="text-xs border-[hsl(var(--status-live))] text-[hsl(var(--status-live))] bg-[hsl(var(--status-live)/0.1)]">
            {signup.label}
          </Badge>
        )}
        {signup.type === 'soon' && (
          <Badge variant="outline" className="text-xs border-[hsl(var(--status-draft))] text-[hsl(var(--status-draft))] bg-[hsl(var(--status-draft)/0.1)]">
            {signup.label}
          </Badge>
        )}
        {signup.type === 'future' && (
          <span className="text-xs text-muted-foreground whitespace-nowrap">{signup.label}</span>
        )}
      </div>

      {/* Actions */}
      <div className="shrink-0">
        {isMobile ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                <MoreVertical className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link to={`/events/${event.id}/edit`}>Edit</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to={`/events/${event.id}/lineup`}>Lineup</Link>
              </DropdownMenuItem>
              {onDelete && (
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onSelect={() => setShowDeleteDialog(true)}
                >
                  Delete
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <div className="flex gap-1.5">
            <Button variant="outline" size="sm" className="h-7 text-xs" asChild>
              <Link to={`/events/${event.id}/edit`}>Edit</Link>
            </Button>
            <Button variant="outline" size="sm" className="h-7 text-xs" asChild>
              <Link to={`/events/${event.id}/lineup`}>Lineup</Link>
            </Button>
            {onDelete && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={() => setShowDeleteDialog(true)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        )}
      </div>

      {onDelete && (
        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete this event?</AlertDialogTitle>
              <AlertDialogDescription>
                This will only delete this single event, not the entire series. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={async () => {
                  setIsDeleting(true);
                  try {
                    await onDelete(event.id);
                  } finally {
                    setIsDeleting(false);
                    setShowDeleteDialog(false);
                  }
                }}
                disabled={isDeleting}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {isDeleting ? 'Deleting\u2026' : 'Delete'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}
