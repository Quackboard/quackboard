import { useState, useEffect } from 'react';
import { z } from 'zod';

const PREFILL_KEY = 'quackboard:comic-prefill';

function readPrefill(): { name: string; email: string; instagram: string } {
  const empty = { name: '', email: '', instagram: '' };
  if (typeof window === 'undefined') return empty;
  try {
    const raw = window.sessionStorage.getItem(PREFILL_KEY);
    if (!raw) return empty;
    const parsed = JSON.parse(raw);
    return {
      name: typeof parsed.name === 'string' ? parsed.name : '',
      email: typeof parsed.email === 'string' ? parsed.email : '',
      instagram: typeof parsed.instagram === 'string' ? parsed.instagram : '',
    };
  } catch {
    return empty;
  }
}
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
import { toast } from '@/hooks/use-toast';
import { createBooking } from '@/lib/email';

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
    defaultValues: readPrefill(),
  });

  useEffect(() => {
    if (open) {
      form.reset(readPrefill());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleSubmit = async (data: FormData) => {
    setIsSubmitting(true);

    // Persist info immediately so a failed attempt doesn't lose their input
    try {
      window.sessionStorage.setItem(
        PREFILL_KEY,
        JSON.stringify({
          name: data.name,
          email: data.email,
          instagram: data.instagram ?? '',
        })
      );
    } catch {
      // ignore storage failures (private mode, quota, etc.)
    }

    try {
      const result = await createBooking({
        eventId,
        slotPosition: spotNumber,
        guestName: data.name,
        guestEmail: data.email,
        guestInstagram: data.instagram,
        allowMultipleSpots,
        isManualAdd: false,
      });

      if (result.success) {
        try {
          window.sessionStorage.setItem(
            PREFILL_KEY,
            JSON.stringify({
              name: data.name,
              email: data.email,
              instagram: data.instagram ?? '',
            })
          );
        } catch {
          // ignore storage failures (private mode, quota, etc.)
        }
        toast({
          title: "You're in!",
          description: sectionLabel ? `You've grabbed a spot in ${sectionLabel}` : "You've grabbed a spot",
        });
        form.reset();
        onOpenChange(false);
        onSuccess();
        return;
      }

      // Handle specific error codes
      switch (result.code) {
        case 'slot_taken':
          toast({
            title: 'Spot already taken',
            description: 'Try another spot',
            variant: 'destructive',
          });
          // Auto-close so they can pick a new spot; keep prefill intact
          onOpenChange(false);
          break;
        case 'duplicate_email':
          toast({
            title: 'One spot per comic',
            description: 'Grab a different time.',
            variant: 'destructive',
          });
          break;
        default:
          toast({
            title: "Oops, that one's on us. Try again!",
            variant: 'destructive',
          });
          break;
      }
    } catch {
      toast({
        title: "Oops, that one's on us. Try again!",
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
          {sectionLabel && <p className="text-xs">{sectionLabel}</p>}
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

            <p className="text-xs text-muted-foreground text-center">
              You'll receive a confirmation email with a link to cancel if needed.
            </p>
            <p className="text-xs text-muted-foreground text-center">
              By signing up, you agree to our{' '}
              <a href="/terms" target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground">Terms of Service</a>{' '}and{' '}
              <a href="/privacy" target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground">Privacy Policy</a>.
            </p>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
