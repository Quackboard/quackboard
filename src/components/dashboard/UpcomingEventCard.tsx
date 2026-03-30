import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatTime } from '@/lib/utils';
import { format, parseISO, differenceInHours, differenceInMinutes } from 'date-fns';

interface UpcomingEventCardProps {
  event: {
    id: string;
    title: string;
    date: string;
    start_time: string;
    end_time: string;
    signup_opens_at: string | null;
  };
  totalSlots: number;
  bookedCount: number;
  happeningNow?: boolean;
}

function getSignupPill(signupOpensAt: string | null, now: Date) {
  if (!signupOpensAt) {
    return { label: 'Sign-ups open', variant: 'green' as const };
  }

  const opensAt = parseISO(signupOpensAt);
  if (now >= opensAt) {
    return { label: 'Sign-ups open', variant: 'green' as const };
  }

  const hoursUntil = differenceInHours(opensAt, now);
  const minutesUntil = differenceInMinutes(opensAt, now);

  if (hoursUntil < 24) {
    const display = hoursUntil >= 1
      ? `Opens in ${hoursUntil}h`
      : `Opens in ${minutesUntil}m`;
    return { label: display, variant: 'amber' as const };
  }

  const dayTime = format(opensAt, "EEEE 'at' h:mma").toLowerCase();
  return { label: `Sign-ups open ${dayTime}`, variant: 'gray' as const };
}

export function UpcomingEventCard({ event, totalSlots, bookedCount, happeningNow }: UpcomingEventCardProps) {
  const now = new Date();
  const spotsAvailable = Math.max(0, totalSlots - bookedCount);
  const signup = getSignupPill(event.signup_opens_at, now);

  const pillClasses = {
    green: 'bg-green-500/15 text-green-600 dark:text-green-400',
    amber: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
    gray: '',
  };

  return (
    <Card className="border-border">
      <CardContent className="py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1.5 min-w-0 flex-1">
            {/* Happening now indicator */}
            {happeningNow && (
              <div className="flex items-center gap-1.5 mb-1">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500" />
                </span>
                <span className="text-xs font-medium text-green-600 dark:text-green-400">Happening Now</span>
              </div>
            )}

            {/* Time range — most prominent */}
            <p className="text-lg font-bold text-foreground">
              {formatTime(event.start_time)} – {formatTime(event.end_time)}
            </p>

            {/* Mic name */}
            <p className="text-sm text-foreground">{event.title}</p>

            {/* Spots */}
            <div className="space-y-0.5">
              {spotsAvailable > 0 ? (
                <p className="text-sm font-semibold text-foreground">
                  {spotsAvailable} spot{spotsAvailable !== 1 ? 's' : ''} available
                </p>
              ) : (
                <p className="text-sm font-semibold text-destructive">Full</p>
              )}
              <p className="text-xs text-muted-foreground">
                {bookedCount}/{totalSlots} filled
              </p>
            </div>

            {/* Signup status pill */}
            {signup.variant !== 'gray' ? (
              <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full ${pillClasses[signup.variant]}`}>
                {signup.label}
              </span>
            ) : (
              <p className="text-xs text-muted-foreground">{signup.label}</p>
            )}
          </div>

          {/* Lineup button */}
          <Button variant="outline" size="sm" className="shrink-0" asChild>
            <Link to={`/events/${event.id}/lineup`}>Lineup</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
