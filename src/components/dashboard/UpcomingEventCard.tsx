import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatTime } from '@/lib/utils';
import { getSignupStatus } from '@/lib/signup-status';

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
}

export function UpcomingEventCard({ event, availability, isHappeningNow }: UpcomingEventCardProps) {
  const totalSlots = availability?.total_slots ?? 0;
  const bookedCount = availability?.booked_count ?? 0;
  const spotsAvailable = Math.max(0, totalSlots - bookedCount);
  const isFull = spotsAvailable === 0 && totalSlots > 0;

  const signup = getSignupStatus(event.signup_opens_at);

  return (
    <Card className="border-border">
      <CardContent className="py-4">
        <div className="flex items-start justify-between gap-4">
          {/* Left content */}
          <div className="space-y-1.5 min-w-0 flex-1">
            {/* Time range — most prominent */}
            <div className="flex items-center gap-2">
              {isHappeningNow && (
                <span className="relative flex h-2.5 w-2.5 shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 bg-[hsl(var(--status-live))]" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[hsl(var(--status-live))]" />
                </span>
              )}
              <span className="text-lg font-bold text-foreground">
                {formatTime(event.start_time)} – {formatTime(event.end_time)}
              </span>
              {isHappeningNow && (
                <span className="text-xs font-medium text-[hsl(var(--status-live))]">Happening Now</span>
              )}
            </div>

            {/* Mic name */}
            <p className="text-sm text-muted-foreground">{event.title}</p>

            {/* Spots */}
            <div className="space-y-0.5">
              {isFull ? (
                <p className="text-sm font-bold text-destructive">Full</p>
              ) : (
                <p className="text-sm font-bold text-foreground">
                  {spotsAvailable} spot{spotsAvailable !== 1 ? 's' : ''} available
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                {bookedCount}/{totalSlots} filled
              </p>
            </div>

            {/* Signup status pill */}
            {signup.type === 'open' && (
              <Badge variant="outline" className="border-[hsl(var(--status-live))] text-[hsl(var(--status-live))] bg-[hsl(var(--status-live)/0.1)]">
                {signup.label}
              </Badge>
            )}
            {signup.type === 'soon' && (
              <Badge variant="outline" className="border-[hsl(var(--status-draft))] text-[hsl(var(--status-draft))] bg-[hsl(var(--status-draft)/0.1)]">
                {signup.label}
              </Badge>
            )}
            {signup.type === 'future' && (
              <p className="text-xs text-muted-foreground">{signup.label}</p>
            )}
          </div>

          {/* Right: Edit + Lineup buttons */}
          <div className="flex gap-2 shrink-0">
            <Button variant="outline" size="sm" asChild>
              <Link to={`/events/${event.id}/edit`}>Edit</Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link to={`/events/${event.id}/lineup`}>Lineup</Link>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
