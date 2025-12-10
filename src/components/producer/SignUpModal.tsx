import { useState } from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

const formSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(100),
  email: z.string().trim().email('Invalid email address').max(255),
  instagram: z.string().trim().max(50).optional(),
});

type FormData = z.infer<typeof formSchema>;

interface SignUpModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventId: string;
  eventTime: string;
  sectionLabel: string;
  spotNumber: number;
  allowMultipleSpots: boolean;
  onSuccess: () => void;
}

export function SignUpModal({
  open,
  onOpenChange,
  eventId,
  eventTime,
  sectionLabel,
  spotNumber,
  allowMultipleSpots,
  onSuccess,
}: SignUpModalProps) {
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
      // Check if spot is already taken
      const { data: existing } = await supabase
        .from('bookings')
        .select('id')
        .eq('event_id', eventId)
        .eq('slot_position', spotNumber)
        .is('cancelled_at', null)
        .maybeSingle();

      if (existing) {
        toast({
          title: 'Spot already taken',
          description: 'Try another spot',
          variant: 'destructive',
        });
        setIsSubmitting(false);
        return;
      }

      // Check if user already has a booking for this event (when multiple spots not allowed)
      if (!allowMultipleSpots) {
        const { data: existingBooking } = await supabase
          .from('bookings')
          .select('id')
          .eq('event_id', eventId)
          .eq('guest_email', data.email.toLowerCase())
          .is('cancelled_at', null)
          .maybeSingle();

        if (existingBooking) {
          toast({
            title: 'One spot per comic',
            description: 'Grab a different time.',
            variant: 'destructive',
          });
          setIsSubmitting(false);
          return;
        }
      }

      // Insert booking
      const { error } = await supabase.from('bookings').insert({
        event_id: eventId,
        slot_position: spotNumber,
        guest_name: data.name,
        guest_email: data.email,
        guest_instagram: data.instagram || null,
      });

      if (error) {
        if (error.code === '23505') {
          toast({
            title: 'Spot already taken',
            description: 'Try another spot',
            variant: 'destructive',
          });
        } else {
          throw error;
        }
        setIsSubmitting(false);
        return;
      }

      toast({
        title: "You're in!",
        description: `You've grabbed spot #${spotNumber}`,
      });

      form.reset();
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      toast({
        title: 'Something went wrong',
        description: 'Please try again',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Grab a Spot</DialogTitle>
        </DialogHeader>
        
        <div className="text-sm text-muted-foreground mb-4">
          <p>{eventTime}</p>
          {sectionLabel && <p className="text-xs">{sectionLabel} · Spot #{spotNumber}</p>}
          {!sectionLabel && <p className="text-xs">Spot #{spotNumber}</p>}
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Your name" {...field} />
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
                    <Input type="email" placeholder="you@example.com" {...field} />
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
                  <FormLabel>Instagram (optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="@yourhandle" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? 'Grabbing...' : 'Grab Spot'}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
