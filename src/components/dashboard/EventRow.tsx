import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { format, parseISO, isAfter } from 'date-fns';
import { cn, formatTime } from '@/lib/utils';
import { activeBookingsList } from '@/lib/eventRowActiveBookings';
import { useIsMobile } from '@/hooks/use-mobile';
import { ChevronDown, MoreVertical, Trash2 } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
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
    bookings?: { id: string; slot_position: number; cancelled_at: string | null }[];
  };
  isPast?: boolean;
  onDelete?: (eventId: string) => Promise<void>;
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

export function EventRow({ event, isPast = false, onDelete }: EventRowProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const now = new Date();
  const isMobile = useIsMobile();
  const sections = parseSections(event.sections_config);
  const activeBookings = activeBookingsList(event.bookings);
  const activeBookingCount = activeBookings.length;

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

  const getSignupStatus = () => {
    if (event.signup_opens_at && isAfter(parseISO(event.signup_opens_at), now)) {
      return { 
        label: `Opens ${formatDateTime(event.signup_opens_at)}`, 
        className: 'text-muted-foreground' 
      };
    }
    return { label: 'Open', className: 'text-foreground' };
  };

  const signupStatus = getSignupStatus();

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
      const total = wildcardCutoffPassed ? bookedCount : section.slots;
      const stats = { label: section.label, booked: bookedCount, total };
      startSlot = endSlot + 1;
      if (wildcardCutoffPassed && bookedCount === 0) return null;
      return stats;
    }).filter(Boolean) as { label: string; booked: number; total: number }[];
  };
  const sectionStats = getSectionStats();

  const totalRegularSlots = sections.filter(s => s.type !== 'wildcard').reduce((sum, s) => sum + s.slots, 0);
  const totalShowSpots = totalRegularSlots + (wildcardSection?.slots || 0);

  const handleDelete = async () => {
    if (!onDelete) return;
    setIsDeleting(true);
    try {
      await onDelete(event.id);
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  const deleteDialog = (
    <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete "{event.title}"?</AlertDialogTitle>
          <AlertDialogDescription>
            {activeBookingCount > 0
              ? `${activeBookingCount} ${activeBookingCount === 1 ? 'person' : 'people'} will be removed from the lineup. This can't be undone.`
              : "This event will be permanently deleted. This can\u2019t be undone."}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={isDeleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isDeleting ? 'Deleting…' : 'Delete'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  if (isPast) {
    return (
      <>
        <Collapsible>
          <Card className="border-border opacity-60">
            <CardContent className="py-3">
              <CollapsibleTrigger asChild>
                <button className="w-full flex items-center justify-between text-left">
                  <div className="flex items-center gap-2 flex-wrap min-w-0 flex-1">
                    <span className="text-sm text-muted-foreground">
                      {format(parseISO(event.date), 'MMM d')}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {formatTime(event.start_time)} - {formatTime(event.end_time)}
                    </span>
                    <span className="text-sm font-medium text-foreground truncate">{event.title}</span>
                  </div>
                  <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0 ml-2 transition-transform [[data-state=open]_&]:rotate-180" />
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-3 space-y-2">
                {sectionStats.length > 0 && (
                  <div className="text-sm text-muted-foreground space-y-0.5">
                    {sectionStats.map((s, i) => (
                      <div key={i}>
                        {s.label} — {s.booked}/{s.total} spots filled
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex items-center gap-3 text-xs">
                  <span className={status.className}>{status.label}</span>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <Button variant="outline" size="sm" className={isMobile ? "flex-1 h-10" : ""} asChild>
                    <Link to={`/events/${event.id}/duplicate`}>Duplicate</Link>
                  </Button>
                  {onDelete && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className={cn("text-destructive hover:text-destructive hover:bg-destructive/10", isMobile && "h-10")}
                      onClick={() => setShowDeleteDialog(true)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </CollapsibleContent>
            </CardContent>
          </Card>
        </Collapsible>
        {deleteDialog}
      </>
    );
  }

  return (
    <>
      <Card className="border-border">
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
              <div className="flex justify-end">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem asChild>
                      <Link to={`/events/${event.id}/edit`}>Edit</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to={`/events/${event.id}/duplicate`}>Duplicate</Link>
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
                {onDelete && (
                  <button
                    onClick={() => setShowDeleteDialog(true)}
                    className="text-destructive hover:text-destructive/80 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      {deleteDialog}
    </>
  );
}
