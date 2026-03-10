import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { CheckCircle2, XCircle, Loader2, Calendar, MapPin, Clock } from 'lucide-react';
import { toast } from '@/hooks/use-toast';


type AlertFrequency = 'none' | 'daily' | 'weekly' | 'immediate';

interface BookingDetails {
  id: string;
  guest_name: string;
  guest_email: string;
  slot_position: number;
  cancelled_at: string | null;
  cancel_token: string;
  event: {
    id: string;
    title: string;
    date: string;
    start_time: string;
    end_time: string;
    venue_name: string;
    venue_address: string | null;
    producer_id: string;
    sections_config: Array<{ label: string; slots: number }> | null;
  };
}

// Format 24h time string (HH:MM or HH:MM:SS) to 12-hour format
function formatTime(time: string): string {
  const [hours, minutes] = time.split(':');
  const hour = parseInt(hours, 10);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 || 12;
  return `${hour12}:${minutes} ${ampm}`;
}

// Helper function to get section label from slot position
function getSectionLabel(slotPosition: number, sectionsConfig: Array<{ label: string; slots: number }> | null): string {
  if (!sectionsConfig || sectionsConfig.length === 0) {
    return 'General';
  }
  
  let currentSlot = 1;
  for (const section of sectionsConfig) {
    const sectionEnd = currentSlot + section.slots - 1;
    if (slotPosition >= currentSlot && slotPosition <= sectionEnd) {
      return section.label;
    }
    currentSlot += section.slots;
  }
  
  return 'General';
}

export default function CancelBooking() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [isCanceling, setIsCanceling] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [alertFrequency, setAlertFrequency] = useState<AlertFrequency>('daily');

  // Fetch booking by cancel token
  const { data: booking, isLoading, error } = useQuery({
    queryKey: ['booking-by-token', token],
    queryFn: async () => {
      if (!token) throw new Error('No token provided');

      const { data, error } = await supabase
        .from('bookings')
        .select(`
          id,
          guest_name,
          guest_email,
          slot_position,
          cancelled_at,
          cancel_token,
          event:events (
            id,
            title,
            date,
            start_time,
            end_time,
            venue_name,
            venue_address,
            producer_id,
            sections_config
          )
        `)
        .eq('cancel_token', token)
        .maybeSingle();

      if (error) throw error;
      if (!data) throw new Error('Booking not found');

      // Supabase returns event as an object (not array) when using relation syntax with .maybeSingle()
      const eventData = Array.isArray(data.event) ? data.event[0] : data.event;
      if (!eventData) throw new Error('Event not found');

      return {
        id: data.id,
        guest_name: data.guest_name,
        guest_email: data.guest_email,
        slot_position: data.slot_position,
        cancelled_at: data.cancelled_at,
        cancel_token: data.cancel_token,
        event: eventData,
      } as BookingDetails;
    },
    enabled: !!token,
    retry: false,
  });

  useEffect(() => {
    // Load saved alert frequency preference (stored in localStorage for simplicity)
    // In production, you might want to store this in a database table
    if (booking) {
      const saved = localStorage.getItem(`alert_freq_${booking.guest_email}`);
      if (saved && ['none', 'daily', 'weekly', 'immediate'].includes(saved)) {
        setAlertFrequency(saved as AlertFrequency);
      }
    }
  }, [booking]);

  const handleCancel = async () => {
    if (!booking || !token) return;

    const confirmed = window.confirm(
      `Are you sure you want to cancel your booking for ${booking.event.title}? This action cannot be undone.`
    );

    if (!confirmed) return;

    setIsCanceling(true);
    try {
      const { data, error } = await supabase.functions.invoke('cancel-booking', {
        body: { cancelToken: token },
      });

      if (error) throw error;

      if (!data?.success) {
        if (data?.code === 'already_cancelled') {
          toast({
            title: 'Already canceled',
            description: 'This booking was already canceled.',
          });
          setTimeout(() => window.location.reload(), 1000);
          return;
        }
        if (data?.code === 'not_found') {
          toast({
            title: 'Booking not found',
            description: 'This booking link is invalid or has expired.',
            variant: 'destructive',
          });
          return;
        }
        throw new Error(data?.code || 'cancel_failed');
      }

      toast({
        title: 'Booking cancelled',
        description: 'Your booking has been successfully cancelled.',
      });

      // Refresh the booking data
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (error) {
      console.error('Error cancelling booking:', error);
      toast({
        title: 'Failed to cancel booking',
        description: 'Please try again or contact support.',
        variant: 'destructive',
      });
    } finally {
      setIsCancelling(false);
    }
  };

  const handleSavePreferences = async () => {
    if (!booking) return;

    setIsSaving(true);
    try {
      // Save alert frequency preference
      // In production, you might want to store this in a database table
      localStorage.setItem(`alert_freq_${booking.guest_email}`, alertFrequency);

      toast({
        title: 'Preferences saved',
        description: 'Your alert preferences have been updated.',
      });
    } catch (error) {
      console.error('Error saving preferences:', error);
      toast({
        title: 'Failed to save preferences',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-2xl">
          <CardHeader>
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-64 mt-2" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-2xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <XCircle className="h-6 w-6" />
              Booking Not Found
            </CardTitle>
            <CardDescription>
              The booking link you're trying to access is invalid or has expired.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate('/')} className="w-full">
              Go to Homepage
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isCancelled = !!booking.cancelled_at;
  // Parse as local date to prevent timezone shift (date is stored as YYYY-MM-DD without timezone)
  const [year, month, day] = booking.event.date.split('-').map(Number);
  const eventDate = new Date(year, month - 1, day).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {isCancelled ? (
                <>
                  <XCircle className="h-6 w-6 text-destructive" />
                  Booking Cancelled
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-6 w-6 text-green-600" />
                  Manage Your Booking
                </>
              )}
            </CardTitle>
            <CardDescription>
              {isCancelled
                ? 'This booking has been cancelled.'
                : `Hello ${booking.guest_name}, manage your booking and alert preferences below.`}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Event Details */}
            <div className="space-y-3 p-4 bg-muted rounded-lg">
              <h3 className="font-semibold text-lg">{booking.event.title}</h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>{eventDate}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span>
                    {formatTime(booking.event.start_time)} - {formatTime(booking.event.end_time)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span>
                    {booking.event.venue_name}
                    {booking.event.venue_address && `, ${booking.event.venue_address}`}
                  </span>
                </div>
                <div className="pt-2 border-t">
                  <span className="text-muted-foreground">Your Slot: </span>
                  <span className="font-medium">#{booking.slot_position}</span>
                </div>
              </div>
            </div>

            {/* Cancel Booking */}
            {!isCancelled && (
              <div className="space-y-4 p-4 border border-destructive/20 rounded-lg bg-destructive/5">
                <div>
                  <h3 className="font-semibold text-destructive mb-2">Cancel Booking</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    If you can no longer attend, you can cancel your booking here. This will free up your slot for
                    someone else.
                  </p>
                  <Button
                    variant="destructive"
                    onClick={handleCancel}
                    disabled={isCancelling}
                    className="w-full sm:w-auto"
                  >
                    {isCancelling ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Cancelling...
                      </>
                    ) : (
                      'Cancel Booking'
                    )}
                  </Button>
                </div>
              </div>
            )}

            {/* Alert Frequency Preferences */}
            {/* <div className="space-y-4 p-4 border rounded-lg">
              <div>
                <h3 className="font-semibold mb-2">Email Alert Frequency</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Choose how often you'd like to receive email updates about your bookings and upcoming events.
                </p>
                <RadioGroup value={alertFrequency} onValueChange={(value) => setAlertFrequency(value as AlertFrequency)}>
                  <div className="flex items-center space-x-2 py-2">
                    <RadioGroupItem value="immediate" id="immediate" />
                    <Label htmlFor="immediate" className="cursor-pointer flex-1">
                      <div className="font-medium">Immediate</div>
                      <div className="text-sm text-muted-foreground">
                        Receive emails as soon as updates happen
                      </div>
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2 py-2">
                    <RadioGroupItem value="daily" id="daily" />
                    <Label htmlFor="daily" className="cursor-pointer flex-1">
                      <div className="font-medium">Daily Summary</div>
                      <div className="text-sm text-muted-foreground">
                        Receive one email per day with all updates
                      </div>
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2 py-2">
                    <RadioGroupItem value="weekly" id="weekly" />
                    <Label htmlFor="weekly" className="cursor-pointer flex-1">
                      <div className="font-medium">Weekly Summary</div>
                      <div className="text-sm text-muted-foreground">
                        Receive one email per week with all updates
                      </div>
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2 py-2">
                    <RadioGroupItem value="none" id="none" />
                    <Label htmlFor="none" className="cursor-pointer flex-1">
                      <div className="font-medium">No Alerts</div>
                      <div className="text-sm text-muted-foreground">
                        Only receive booking confirmation emails
                      </div>
                    </Label>
                  </div>
                </RadioGroup>
              </div>
              <Button
                onClick={handleSavePreferences}
                disabled={isSaving}
                className="w-full sm:w-auto"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Preferences'
                )}
              </Button>
            </div> */}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
