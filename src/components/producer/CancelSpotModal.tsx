import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface BookingChoice {
  id: string;
  guest_name: string;
  slot_position: number;
}

interface CancelSpotModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventId: string;
  onCancelled: () => void;
}

export function CancelSpotModal({ open, onOpenChange, eventId, onCancelled }: CancelSpotModalProps) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [choices, setChoices] = useState<BookingChoice[] | null>(null);

  const reset = () => {
    setEmail('');
    setLoading(false);
    setChoices(null);
  };

  const handleClose = (open: boolean) => {
    if (!open) reset();
    onOpenChange(open);
  };

  const submit = async (bookingId?: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('cancel-booking-by-email', {
        body: { eventId, email: email.trim(), bookingId },
      });

      if (error) {
        toast({ title: 'Something went wrong', description: 'Please try again later.', variant: 'destructive' });
        setLoading(false);
        return;
      }

      if (data?.code === 'rate_limited') {
        toast({ title: 'Too many requests', description: 'Please wait a minute and try again.', variant: 'destructive' });
        setLoading(false);
        return;
      }

      if (data?.code === 'not_found') {
        toast({ title: 'No booking found', description: 'No active booking found for this email.', variant: 'destructive' });
        setLoading(false);
        return;
      }

      if (data?.code === 'multiple' && data?.bookings) {
        setChoices(data.bookings as BookingChoice[]);
        setLoading(false);
        return;
      }

      if (data?.success && data?.cancelled) {
        toast({ title: 'Your spot has been cancelled' });
        onCancelled();
        handleClose(false);
        return;
      }

      toast({ title: 'Something went wrong', description: 'Please try again.', variant: 'destructive' });
    } catch {
      toast({ title: 'Something went wrong', description: 'Please try again later.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Cancel Your Spot</DialogTitle>
          <DialogDescription>
            We'll use your email to confirm it's you.
          </DialogDescription>
        </DialogHeader>

        {!choices ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (email.trim()) submit();
            }}
            className="space-y-4"
          >
            <Input
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
            />
            <Button type="submit" variant="destructive" className="w-full" disabled={loading || !email.trim()}>
              {loading ? 'Cancelling…' : 'Cancel My Spot'}
            </Button>
            <p className="text-xs text-muted-foreground text-center">
              This can't be undone, but you can sign up again.
            </p>
          </form>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              You have multiple spots booked. Which one would you like to cancel?
            </p>
            {choices.map((b) => (
              <Button
                key={b.id}
                variant="outline"
                className="w-full justify-between"
                disabled={loading}
                onClick={() => submit(b.id)}
              >
                <span>Spot #{b.slot_position} — {b.guest_name}</span>
              </Button>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
