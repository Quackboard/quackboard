import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { sendBookingConfirmationEmail } from '@/lib/email';

const formSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(100),
  email: z.string().trim().min(1, 'Email is required').email('Enter a valid email').max(255),
  instagram: z.string().trim().max(50).optional(),
});

type FormData = z.infer<typeof formSchema>;

interface AddToSlotModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventId: string;
  slotPosition: number;
  sectionLabel: string;
  onSuccess: () => void;
}

export function AddToSlotModal({
  open,
  onOpenChange,
  eventId,
  slotPosition,
  sectionLabel,
  onSuccess,
}: AddToSlotModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      email: '',
      instagram: '',
    },
  });

  const handleSubmit = async (data: FormData) => {
    setIsSubmitting(true);

    try {
      // Check if slot is still available
      const { data: existingBooking } = await supabase
        .from('bookings')
        .select('id')
        .eq('event_id', eventId)
        .eq('slot_position', slotPosition)
        .is('cancelled_at', null)
        .maybeSingle();

      if (existingBooking) {
        toast({
          title: 'Slot already taken',
          description: 'Someone just signed up for this slot.',
          variant: 'destructive',
        });
        setIsSubmitting(false);
        return;
      }

      // Generate cancel token
      const cancelToken = crypto.randomUUID();

      // Insert booking
      const { data: bookingData, error } = await supabase
        .from('bookings')
        .insert({
          event_id: eventId,
          slot_position: slotPosition,
          guest_name: data.name,
          guest_email: data.email,
          guest_instagram: data.instagram || null,
          cancel_token: cancelToken,
        })
        .select('id')
        .single();

      if (error) throw error;

      // Fetch event details for email
      const { data: eventData } = await supabase
        .from('events')
        .select('title, date, start_time, end_time, venue_name, venue_address, producer_id, producer_message')
        .eq('id', eventId)
        .maybeSingle();

      // Send confirmation email (non-blocking)
      if (eventData && bookingData && eventData.producer_id) {
        sendBookingConfirmationEmail({
          bookingId: bookingData.id,
          cancelToken,
          guestEmail: data.email,
          guestName: data.name,
          slotPosition,
          sectionLabel,
          event: {
            title: eventData.title || 'Open Mic',
            date: eventData.date,
            start_time: eventData.start_time || '',
            end_time: eventData.end_time || '',
            venue_name: eventData.venue_name || '',
            venue_address: eventData.venue_address,
            producer_id: eventData.producer_id,
            producer_message: eventData.producer_message,
          },
          isManualAdd: true,
        }).catch((err) => {
          console.error('Failed to send confirmation email:', err);
          // Don't show error to user - booking was successful
        });
      }

      toast({
        title: `Added to slot ${slotPosition}`,
      });

      form.reset();
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      console.error('Failed to add booking:', error);
      toast({
        title: 'Failed to add to lineup',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = (open: boolean) => {
    if (!open) {
      form.reset();
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add to Slot {slotPosition}</DialogTitle>
          <p className="text-sm text-muted-foreground">Section: {sectionLabel}</p>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="Enter email" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="instagram"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Instagram</FormLabel>
                  <FormControl>
                    <Input placeholder="username (optional)" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleClose(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Adding...' : 'Add'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
