import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatTime } from '@/lib/utils';
import { getSignupStatus } from '@/lib/signup-status';
import { format, parseISO } from 'date-fns';
import { MoreVertical, Trash2 } from 'lucide-react';
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

interface UpcomingEventCardProps {
  event: {
    id: string;
    title: string;
    date: string;
    start_time: string;
    end_time: string;
    signup_opens_at: string | null;
  };
  availability: {
    total_slots: number;
    booked_count: number;
  } | null;
  isHappeningNow?: boolean;
  activeBookingCount?: number;
  onDelete?: (eventId: string) => Promise<void>;
}

export function UpcomingEventCard({ event, availability, isHappeningNow, activeBookingCount = 0, onDelete }: UpcomingEventCardProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const isMobile = useIsMobile();

  const totalSlots = availability?.total_slots ?? 0;
  const bookedCount = availability?.booked_count ?? 0;
  const spotsAvailable = Math.max(0, totalSlots - bookedCount);
  const isFull = spotsAvailable === 0 && totalSlots > 0;

  const signup = getSignupStatus(event.signup_opens_at);
  const formattedDate = format(parseISO(event.date), 'EEE MM/dd/yyyy');

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

  return (
    <>
      <Card className="border-border">
        <CardContent className="py-3 px-4">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
            {/* Left content */}
            <div className="min-w-0 flex-1 space-y-1">
              {/* Line 1: Title · Date · Time */}
              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                {isHappeningNow && (
                  <span className="relative flex h-2.5 w-2.5 shrink-0">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 bg-[hsl(var(--status-live))]" />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[hsl(var(--status-live))]" />
                  </span>
                )}
                <span className="text-sm font-semibold text-foreground truncate">{event.title}</span>
                <span className="text-muted-foreground hidden sm:inline">·</span>
                <span className="text-sm text-muted-foreground whitespace-nowrap">{formattedDate}</span>
                <span className="text-muted-foreground hidden sm:inline">·</span>
                <span className="text-sm text-foreground whitespace-nowrap font-medium">
                  {formatTime(event.start_time)} – {formatTime(event.end_time)}
                </span>
                {isHappeningNow && (
                  <span className="text-xs font-medium text-[hsl(var(--status-live))]">Live</span>
                )}
              </div>

              {/* Line 2: Spots + signup status */}
              <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5">
                {isFull ? (
                  <span className="text-xs font-bold text-destructive">Full</span>
                ) : (
                  <span className="text-xs font-medium text-foreground">
                    {spotsAvailable} spot{spotsAvailable !== 1 ? 's' : ''} available
                  </span>
                )}
                <span className="text-xs text-muted-foreground">
                  {bookedCount}/{totalSlots} filled
                </span>

                {signup.type === 'open' && (
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-[hsl(var(--status-live))] text-[hsl(var(--status-live))] bg-[hsl(var(--status-live)/0.1)]">
                    {signup.label}
                  </Badge>
                )}
                {signup.type === 'soon' && (
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-[hsl(var(--status-draft))] text-[hsl(var(--status-draft))] bg-[hsl(var(--status-draft)/0.1)]">
                    {signup.label}
                  </Badge>
                )}
                {signup.type === 'future' && (
                  <span className="text-xs text-muted-foreground">{signup.label}</span>
                )}
              </div>
            </div>

            {/* Right: Actions */}
            <div className="shrink-0">
              {isMobile ? (
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
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" asChild>
                    <Link to={`/events/${event.id}/edit`}>Edit</Link>
                  </Button>
                  <Button variant="outline" size="sm" asChild>
                    <Link to={`/events/${event.id}/lineup`}>Lineup</Link>
                  </Button>
                  {onDelete && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => setShowDeleteDialog(true)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{event.title}"?</AlertDialogTitle>
            <AlertDialogDescription>
              {activeBookingCount > 0
                ? `${activeBookingCount} ${activeBookingCount === 1 ? 'person' : 'people'} will be removed from the lineup. This can't be undone.`
                : 'This event will be permanently deleted. This can't be undone.'}
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
    </>
  );
}
