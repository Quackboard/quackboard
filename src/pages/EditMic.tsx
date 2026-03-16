import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format, parseISO, isPast, startOfDay } from 'date-fns';
import { fromZonedTime, toZonedTime } from 'date-fns-tz';
import { CalendarIcon, Plus, Trash2, Loader2, Copy, ArrowLeft, Zap } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useProducerFeatures } from '@/hooks/useProducerFeatures';

import { ProducerLayout } from '@/components/layouts/ProducerLayout';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { MarkdownEditor } from '@/components/ui/MarkdownEditor';
import { useToast } from '@/hooks/use-toast';
import { useFormDraft } from '@/hooks/useFormDraft';
import { sendMicGoesLiveEmail } from '@/lib/email';
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
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

interface Section {
  label: string;
  slots: number;
  type?: 'regular' | 'wildcard';
  signup_opens_at?: string;
}

interface Booking {
  id: string;
  slot_position: number;
  cancelled_at: string | null;
  guest_name: string;
  guest_email: string;
  guest_instagram: string | null;
}

const sectionSchema = z.object({
  label: z.string(),
  slots: z.number().min(0),
  type: z.enum(['regular', 'wildcard']).optional(),
  signup_opens_at_date: z.date().optional(),
  signup_opens_at_time: z.string().optional(),
}).refine((data) => {
  if (data.type === 'wildcard') return true;
  return data.slots >= 1;
}, { message: 'At least 1 spot required', path: ['slots'] }).refine((data) => {
  if (data.type === 'wildcard' && !data.signup_opens_at_date) return false;
  return true;
}, { message: 'Cutoff date is required', path: ['signup_opens_at_date'] }).refine((data) => {
  if (data.type === 'wildcard' && !data.signup_opens_at_time) return false;
  return true;
}, { message: 'Cutoff time is required', path: ['signup_opens_at_time'] });

const formSchema = z.object({
  date: z.date({
    required_error: 'Date is required',
    invalid_type_error: 'Please select a valid date',
  }),
  startTime: z.string().min(1, 'Start time is required'),
  endTime: z.string().min(1, 'End time is required'),
  title: z.string().optional(),
  venueName: z.string().min(1, 'Venue name is required'),
  venueAddress: z.string().min(1, 'Venue address is required'),
  sections: z.array(sectionSchema).min(1, 'At least one section required'),
  allowMultipleSlots: z.boolean(),
  publishOption: z.enum(['now', 'later']),
  publishAt: z.date({ invalid_type_error: 'Please select a valid date' }).optional(),
  publishAtTime: z.string().optional(),
  signupOption: z.enum(['live', 'later']),
  signupOpensAt: z.date({ invalid_type_error: 'Please select a valid date' }).optional(),
  signupOpensAtTime: z.string().optional(),
  producerMessage: z.string().refine(val => (val.trim() ? val.trim().split(/\s+/).length : 0) <= 500, 'Message limit reached (500 words)').optional(),
  emailFrequency: z.enum(['none', 'immediate', 'daily']).optional(),
}).refine((data) => {
  if (!data.startTime || !data.endTime) return true;
  return data.startTime < data.endTime;
}, {
  message: 'End time must be after start time',
  path: ['endTime'],
});

function combineDateAndTime(date: Date, time: string): Date {
  const [hours, minutes] = time.split(':').map(Number);
  const combined = new Date(date);
  combined.setHours(hours, minutes, 0, 0);
  return combined;
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

function formatTime12h(time: string): string {
  const [hours, minutes] = time.split(':');
  const hour = parseInt(hours, 10);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 || 12;
  return `${hour12}:${minutes} ${ampm}`;
}

type FormData = z.infer<typeof formSchema>;

export default function EditMic() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { hasFeature } = useProducerFeatures();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [sectionErrors, setSectionErrors] = useState<Record<number, string>>({});

  // Track original publish/signup values for conditional validation
  const [originalPublishAt, setOriginalPublishAt] = useState<string | null>(null);
  const [originalSignupOpensAt, setOriginalSignupOpensAt] = useState<string | null>(null);

  // Fetch event with bookings
  const { data: event, isLoading: eventLoading, error: eventError } = useQuery({
    queryKey: ['event-edit', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('events')
        .select(`
          *,
          bookings (
            id,
            slot_position,
            cancelled_at,
            guest_name,
            guest_email,
            guest_instagram
          )
        `)
        .eq('id', id!)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  // Fetch producer profile
  const { data: producer } = useQuery({
    queryKey: ['producer-profile', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('producers')
        .select('timezone')
        .eq('id', user!.id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const timezone = producer?.timezone || 'America/Los_Angeles';

  // Check authorization and past event status
  const isAuthorized = event?.producer_id === user?.id;
  const eventDate = event?.date ? parseISO(event.date) : null;
  const isEventPast = eventDate ? isPast(startOfDay(eventDate)) : false;

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      sections: [{ label: '', slots: 10 }],
      allowMultipleSlots: false,
      publishOption: 'now',
      signupOption: 'live',
      emailFrequency: 'none',
    },
  });

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    reset,
    trigger,
    formState: { errors, isDirty },
  } = form;

  const draftKey = `quackboard_edit_mic_${id}_draft`;
  const { clearDraft } = useFormDraft({
    form,
    storageKey: draftKey,
  });

  // Initialize form with event data
  useEffect(() => {
    if (event && producer && !isEventPast) {
      const sections = parseSections(event.sections_config);

      // Parse publish_at to local timezone
      let publishOption: 'now' | 'later' = 'now';
      let publishAtDate: Date | undefined;
      let publishAtTime: string | undefined;
      if (event.publish_at) {
        const localPublishAt = toZonedTime(parseISO(event.publish_at), timezone);
        publishOption = 'later';
        publishAtDate = localPublishAt;
        publishAtTime = format(localPublishAt, 'HH:mm');
      }

      // Parse signup_opens_at to local timezone
      let signupOption: 'live' | 'later' = 'live';
      let signupOpensAtDate: Date | undefined;
      let signupOpensAtTime: string | undefined;
      if (event.signup_opens_at) {
        const localSignupAt = toZonedTime(parseISO(event.signup_opens_at), timezone);
        signupOption = 'later';
        signupOpensAtDate = localSignupAt;
        signupOpensAtTime = format(localSignupAt, 'HH:mm');
      }

      // Check if we have a draft in localStorage
      const savedDraft = localStorage.getItem(draftKey);
      if (!savedDraft) {
        // Convert wildcard sections' signup_opens_at to date/time fields
        const formSections = (sections.length > 0 ? sections : [{ label: '', slots: 10 }]).map(s => {
          if (s.type === 'wildcard' && s.signup_opens_at) {
            const localCutoff = toZonedTime(parseISO(s.signup_opens_at), timezone);
            return {
              label: s.label,
              slots: s.slots,
              type: s.type as 'regular' | 'wildcard',
              signup_opens_at_date: localCutoff,
              signup_opens_at_time: format(localCutoff, 'HH:mm'),
            };
          }
          return { label: s.label, slots: s.slots, type: s.type as 'regular' | 'wildcard' | undefined };
        });

        reset({
          date: parseISO(event.date),
          startTime: event.start_time.slice(0, 5),
          endTime: event.end_time.slice(0, 5),
          title: event.title || '',
          venueName: event.venue_name,
          venueAddress: event.venue_address,
          sections: formSections,
          allowMultipleSlots: event.allow_multiple_slots || false,
          publishOption,
          publishAt: publishAtDate,
          publishAtTime,
          signupOption,
          signupOpensAt: signupOpensAtDate,
          signupOpensAtTime,
          producerMessage: event.producer_message || '',
          emailFrequency: event.email_frequency === 'disabled' || event.email_frequency === 'Email setting not active'
            ? 'none'
            : (event.email_frequency === 'immediate' || event.email_frequency === 'daily'
              ? event.email_frequency
              : 'none'),
        });
      }

      // Store originals for conditional validation
      setOriginalPublishAt(event.publish_at);
      setOriginalSignupOpensAt(event.signup_opens_at);
    }
  }, [event, producer, timezone, reset, draftKey, isEventPast]);

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'sections',
  });

  const watchPublishOption = watch('publishOption');
  const watchSignupOption = watch('signupOption');
  const watchDate = watch('date');
  const watchSections = watch('sections');

  // Calculate bookings per section
  const activeBookings = useMemo(() => {
    return (event?.bookings as Booking[] | undefined)?.filter(b => !b.cancelled_at) || [];
  }, [event?.bookings]);

  const getBookingsInSection = (sectionIndex: number): number => {
    const sections = parseSections(event?.sections_config);
    let startSlot = 1;
    for (let i = 0; i < sectionIndex; i++) {
      startSlot += sections[i]?.slots || 0;
    }
    const endSlot = startSlot + (sections[sectionIndex]?.slots || 0) - 1;
    return activeBookings.filter(b => b.slot_position >= startSlot && b.slot_position <= endSlot).length;
  };

  // Validate section slots on change
  useEffect(() => {
    if (!event) return;
    const originalSections = parseSections(event.sections_config);
    const newErrors: Record<number, string> = {};

    watchSections.forEach((section, index) => {
      if (index < originalSections.length) {
        const bookedCount = getBookingsInSection(index);
        if (section.slots < bookedCount) {
          newErrors[index] = `Can't reduce to ${section.slots} spots — ${bookedCount} are already booked. Remove people from the roster first.`;
        }
      }
    });

    setSectionErrors(newErrors);
  }, [watchSections, event, activeBookings]);

  const hasBlockingSectionErrors = Object.keys(sectionErrors).length > 0;

  const validateScheduling = (data: FormData): string | null => {
    // Check end time after start time
    if (data.startTime && data.endTime && data.startTime >= data.endTime) {
      return 'End time must be after start time';
    }

    const now = new Date();

    // Check publish_at - only if changed
    if (data.publishOption === 'later' && data.publishAt && data.publishAtTime) {
      const publishDateTime = combineDateAndTime(data.publishAt, data.publishAtTime);
      const utcPublish = fromZonedTime(publishDateTime, timezone);

      // Only validate future if it's a new value or changed
      const originalWasScheduled = !!originalPublishAt;
      const isChanged = !originalWasScheduled || utcPublish.toISOString() !== originalPublishAt;

      if (isChanged && utcPublish <= now) {
        return 'Publish time must be in the future';
      }
    }

    // Check signup_opens_at - only if changed
    if (data.signupOption === 'later' && data.signupOpensAt && data.signupOpensAtTime) {
      const signupDateTime = combineDateAndTime(data.signupOpensAt, data.signupOpensAtTime);
      const utcSignup = fromZonedTime(signupDateTime, timezone);

      const originalWasScheduled = !!originalSignupOpensAt;
      const isChanged = !originalWasScheduled || utcSignup.toISOString() !== originalSignupOpensAt;

      if (isChanged && utcSignup <= now) {
        return 'Signup time must be in the future';
      }
    }

    // Check signup_opens_at >= publish_at
    if (data.publishOption === 'later' && data.signupOption === 'later') {
      if (data.publishAt && data.publishAtTime && data.signupOpensAt && data.signupOpensAtTime) {
        const publishDateTime = combineDateAndTime(data.publishAt, data.publishAtTime);
        const signupDateTime = combineDateAndTime(data.signupOpensAt, data.signupOpensAtTime);
        if (signupDateTime < publishDateTime) {
          return 'Signup time must be on or after publish time';
        }
      }
    }

    // Check signup opens before event starts
    if (data.signupOption === 'later' && data.date && data.startTime && data.signupOpensAt && data.signupOpensAtTime) {
      const eventStartDateTime = combineDateAndTime(data.date, data.startTime);
      const signupDateTime = combineDateAndTime(data.signupOpensAt, data.signupOpensAtTime);
      if (signupDateTime >= eventStartDateTime) {
        return 'Sign-ups must open before the mic starts';
      }
    }

    return null;
  };

  const onSubmit = async (data: FormData, status: 'draft' | 'published') => {
    if (!user || !id) return;

    // Validate scheduling
    const scheduleError = validateScheduling(data);
    if (scheduleError) {
      toast({
        title: 'Validation Error',
        description: scheduleError,
        variant: 'destructive',
      });
      return;
    }

    if (hasBlockingSectionErrors) {
      // Section errors are shown inline next to the section inputs.
      return;
    }

    setIsSubmitting(true);

    try {
      const sectionsConfig = data.sections.map(s => {
        if (s.type === 'wildcard' && s.signup_opens_at_date && s.signup_opens_at_time) {
          const localCutoff = combineDateAndTime(s.signup_opens_at_date, s.signup_opens_at_time);
          const utcCutoff = fromZonedTime(localCutoff, timezone).toISOString();
          return { label: s.label, slots: s.slots || 0, type: 'wildcard' as const, signup_opens_at: utcCutoff };
        }
        return { label: s.label, slots: s.slots };
      });

      // Handle publish_at
      let publishAt: string | null = null;
      if (status === 'published' && data.publishOption === 'later' && data.publishAt && data.publishAtTime) {
        const localDateTime = combineDateAndTime(data.publishAt, data.publishAtTime);
        publishAt = fromZonedTime(localDateTime, timezone).toISOString();
      }

      // Handle signup_opens_at
      let signupOpensAt: string | null = null;
      if (data.signupOption === 'later' && data.signupOpensAt && data.signupOpensAtTime) {
        const localDateTime = combineDateAndTime(data.signupOpensAt, data.signupOpensAtTime);
        signupOpensAt = fromZonedTime(localDateTime, timezone).toISOString();
      }

      const previousStatus = event?.status;
      const previousPublishAt = event?.publish_at;
      const isBeingPublished = previousStatus !== 'published' && status === 'published';
      const publishAtChanged = previousPublishAt !== publishAt;

      const { error } = await supabase
        .from('events')
        .update({
          date: format(data.date, 'yyyy-MM-dd'),
          start_time: data.startTime,
          end_time: data.endTime,
          title: data.title || `Mic on ${format(data.date, 'MMM d')}`,
          venue_name: data.venueName,
          venue_address: data.venueAddress,
          sections_config: sectionsConfig,
          allow_multiple_slots: data.allowMultipleSlots,
          status,
          publish_at: publishAt,
          signup_opens_at: signupOpensAt,
          producer_message: data.producerMessage || null,
          // Explicit mapping to 'disabled' for backend clarity
          email_frequency: data.emailFrequency === 'none' ? 'disabled' : (data.emailFrequency || 'disabled'),
        })
        .eq('id', id);

      if (error) throw error;

      // Handle email notification based on publish option
      if (status === 'published') {
        if (isBeingPublished) {
          // Event is being published for the first time
          if (data.publishOption === 'now') {
            // Send email immediately
            await sendMicGoesLiveEmail({
              eventId: id!,
              producerId: user.id,
            });
          } else if (data.publishOption === 'later' && publishAt) {
            // Schedule email to be sent when mic goes live (at publish_at time)
            const { error: scheduleError } = await supabase.from('scheduled_messages').insert({
              producer_id: user.id,
              event_id: id!,
              subject: `Your mic "${data.title || `Mic on ${format(data.date, 'MMM d')}`}" is now live!`,
              body_markdown: `Your mic "${data.title || `Mic on ${format(data.date, 'MMM d')}`}" is now live and accepting sign-ups.`,
              send_at: publishAt,
              status: 'pending',
            });

            if (scheduleError) {
              console.error('Error scheduling mic goes live email:', scheduleError);
            }
          }
        } else if (publishAtChanged && data.publishOption === 'later' && publishAt) {
          // Event was already published but publish_at changed - update scheduled message
          // First, delete any existing scheduled messages for this event
          await supabase
            .from('scheduled_messages')
            .delete()
            .eq('event_id', id!)
            .eq('status', 'pending');

          // Create new scheduled message with updated time
          const { error: scheduleError } = await supabase.from('scheduled_messages').insert({
            producer_id: user.id,
            event_id: id!,
            subject: `Your mic "${data.title || `Mic on ${format(data.date, 'MMM d')}`}" is now live!`,
            body_markdown: `Your mic "${data.title || `Mic on ${format(data.date, 'MMM d')}`}" is now live and accepting sign-ups.`,
            send_at: publishAt,
            status: 'pending',
          });

          if (scheduleError) {
            console.error('Error updating scheduled mic goes live email:', scheduleError);
          }
        } else if (publishAtChanged && data.publishOption === 'now') {
          // Changed from scheduled to now - send immediately and delete scheduled message
          await supabase
            .from('scheduled_messages')
            .delete()
            .eq('event_id', id!)
            .eq('status', 'pending');

          await sendMicGoesLiveEmail({
            eventId: id!,
            producerId: user.id,
          });
        }
      }

      toast({
        title: 'Mic updated!',
        description: status === 'draft' ? 'Saved as draft.' : 'Changes are now live.',
      });

      clearDraft();
      navigate('/dashboard');
    } catch (error: any) {
      toast({
        title: 'Error updating mic',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    if (isDirty) {
      setShowCancelDialog(true);
    } else {
      navigate('/dashboard');
    }
  };

  const handleDiscard = () => {
    clearDraft();
    navigate('/dashboard');
  };

  const handleDelete = async () => {
    if (!id) return;

    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from('events')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Mic deleted',
        description: 'The mic and all bookings have been removed.',
      });

      clearDraft();
      navigate('/dashboard');
    } catch (error: any) {
      toast({
        title: 'Error deleting mic',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  const handleExportEmails = () => {
    const emails = activeBookings.map(b => b.guest_email).join('\n');
    navigator.clipboard.writeText(emails);
    toast({
      title: 'Copied!',
      description: `${activeBookings.length} email(s) copied to clipboard.`,
    });
  };

  // Loading state
  if (eventLoading) {
    return (
      <ProducerLayout className="max-w-xl">
        <Skeleton className="h-8 w-48 mb-8" />
        <div className="space-y-6">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </ProducerLayout>
    );
  }

  // Event not found or error
  if (eventError || !event) {
    return (
      <ProducerLayout className="max-w-xl">
        <div className="text-center py-12">
          <h1 className="text-2xl font-semibold text-foreground mb-4">Event not found</h1>
          <Button onClick={() => navigate('/dashboard')}>Back to Dashboard</Button>
        </div>
      </ProducerLayout>
    );
  }

  // Not authorized
  if (!isAuthorized) {
    navigate('/dashboard');
    return null;
  }

  // Past event - read-only view
  if (isEventPast) {
    const sections = parseSections(event.sections_config);

    // Calculate section stats
    const getSectionStats = () => {
      let startSlot = 1;
      return sections.map(section => {
        const endSlot = startSlot + section.slots - 1;
        const sectionBookings = activeBookings.filter(
          b => b.slot_position >= startSlot && b.slot_position <= endSlot
        );
        const stats = {
          label: section.label,
          bookings: sectionBookings,
          total: section.slots
        };
        startSlot = endSlot + 1;
        return stats;
      });
    };
    const sectionStats = getSectionStats();

    return (
      <ProducerLayout className="max-w-xl">
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-semibold text-foreground">Past Event</h1>
        </div>

        <Card className="mb-6">
          <CardContent className="py-6 space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Date</p>
              <p className="font-medium">{format(parseISO(event.date), 'EEEE, MMMM d, yyyy')}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Start Time</p>
                <p className="font-medium">{formatTime12h(event.start_time)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">End Time</p>
                <p className="font-medium">{formatTime12h(event.end_time)}</p>
              </div>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Venue</p>
              <p className="font-medium">{event.venue_name}</p>
              <p className="text-sm text-muted-foreground">{event.venue_address}</p>
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-medium text-foreground">
            Roster ({activeBookings.length} signed up)
          </h2>
          {activeBookings.length > 0 && (
            <Button variant="outline" size="sm" onClick={handleExportEmails}>
              <Copy className="h-4 w-4 mr-2" />
              Copy Emails
            </Button>
          )}
        </div>

        {sectionStats.map((section, sectionIndex) => (
          <div key={sectionIndex} className="mb-6">
            <h3 className="text-sm font-medium text-muted-foreground mb-2">
              {section.label} ({section.bookings.length}/{section.total})
            </h3>
            {section.bookings.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">No sign-ups</p>
            ) : (
              <div className="space-y-2">
                {section.bookings.map((booking, i) => (
                  <Card key={booking.id}>
                    <CardContent className="py-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{booking.guest_name}</p>
                          <p className="text-sm text-muted-foreground">{booking.guest_email}</p>
                          {booking.guest_instagram && (
                            <p className="text-sm text-muted-foreground">@{booking.guest_instagram}</p>
                          )}
                        </div>
                        <span className="text-sm text-muted-foreground">#{booking.slot_position}</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        ))}

        <div className="pt-4">
          <Button variant="outline" onClick={() => navigate('/dashboard')}>
            Back to Dashboard
          </Button>
        </div>
      </ProducerLayout>
    );
  }

  // Editable form
  return (
    <ProducerLayout className="max-w-xl">
      <h1 className="text-2xl font-semibold text-foreground mb-8">Edit Mic</h1>

      <form className="space-y-8">
        {/* Event Details */}
        <section className="space-y-4">
          <h2 className="text-lg font-medium text-foreground">Event Details</h2>

          {/* Date */}
          <div className="space-y-2">
            <Label>Date *</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    'w-full justify-start text-left font-normal',
                    !watchDate && 'text-muted-foreground'
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {watchDate ? format(watchDate, 'PPP') : 'Pick a date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={watchDate}
                  onSelect={(date) => date && setValue('date', date)}
                  initialFocus
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
            {errors.date && (
              <p className="text-sm text-destructive">{errors.date.message}</p>
            )}
          </div>

          {/* Time Range */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startTime">Start Time *</Label>
              <Input
                id="startTime"
                type="time"
                {...register('startTime')}
              />
              {errors.startTime && (
                <p className="text-sm text-destructive">{errors.startTime.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="endTime">End Time *</Label>
              <Input
                id="endTime"
                type="time"
                {...register('endTime')}
              />
              {errors.endTime && (
                <p className="text-sm text-destructive">{errors.endTime.message}</p>
              )}
            </div>
          </div>

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Title (optional)</Label>
            <Input
              id="title"
              placeholder="e.g., Tuesday Night Open Mic"
              {...register('title')}
            />
            <p className="text-sm text-muted-foreground">Just for you — comics won't see this</p>
          </div>
        </section>

        {/* Venue */}
        <section className="space-y-4">
          <h2 className="text-lg font-medium text-foreground">Venue</h2>

          <div className="space-y-2">
            <Label htmlFor="venueName">Venue Name *</Label>
            <Input
              id="venueName"
              placeholder="e.g., The Comedy Store"
              {...register('venueName')}
            />
            {errors.venueName && (
              <p className="text-sm text-destructive">{errors.venueName.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="venueAddress">Venue Address *</Label>
            <Input
              id="venueAddress"
              placeholder="e.g., 123 Main St, Los Angeles, CA"
              {...register('venueAddress')}
            />
            {errors.venueAddress && (
              <p className="text-sm text-destructive">{errors.venueAddress.message}</p>
            )}
          </div>
        </section>

        {/* Sections Builder */}
        <section className="space-y-4">
          <h2 className="text-lg font-medium text-foreground">Sections</h2>

          <div className="space-y-3">
            {fields.map((field, index) => {
              const sectionType = watch(`sections.${index}.type`);
              const isWildcard = sectionType === 'wildcard';
              const bookedCount = index < parseSections(event.sections_config).length
                ? getBookingsInSection(index)
                : 0;

              if (isWildcard) {
                return (
                  <div key={field.id} className="space-y-3 rounded-lg border border-primary/30 bg-primary/5 p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Zap className="h-4 w-4 text-primary" />
                        <span className="text-sm font-medium text-foreground">Wildcard Section</span>
                      </div>
                      {bookedCount === 0 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => remove(index)}
                          className="text-muted-foreground hover:text-destructive h-8 w-8"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    <Input
                      placeholder="Section label (e.g., Wildcards)"
                      {...register(`sections.${index}.label`)}
                    />
                    <div className="space-y-2">
                      <Label className="text-sm">Cutoff / Signup opens at</Label>
                      <div className="grid grid-cols-2 gap-3">
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className={cn(
                                'justify-start text-left font-normal',
                                !watch(`sections.${index}.signup_opens_at_date`) && 'text-muted-foreground'
                              )}
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {watch(`sections.${index}.signup_opens_at_date`)
                                ? format(watch(`sections.${index}.signup_opens_at_date`)!, 'PP')
                                : 'Date'}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={watch(`sections.${index}.signup_opens_at_date`)}
                              onSelect={(date) => date && setValue(`sections.${index}.signup_opens_at_date`, date)}
                              initialFocus
                              className="pointer-events-auto"
                            />
                          </PopoverContent>
                        </Popover>
                        <Input
                          type="time"
                          {...register(`sections.${index}.signup_opens_at_time`)}
                        />
                      </div>
                      {errors.sections?.[index] && (
                        <p className="text-sm text-destructive">
                          {(errors.sections[index] as any)?.signup_opens_at_date?.message ||
                           (errors.sections[index] as any)?.signup_opens_at_time?.message}
                        </p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm">Reserved wildcard spots</Label>
                      <Input
                        type="number"
                        min={0}
                        placeholder="0"
                        {...register(`sections.${index}.slots`, { valueAsNumber: true })}
                      />
                      {(() => {
                        const allSections = watch('sections') || [];
                        const totalRegular = allSections
                          .filter((_: any, i: number) => i !== index && allSections[i]?.type !== 'wildcard')
                          .reduce((sum: number, s: any) => sum + (Number(s?.slots) || 0), 0);
                        const reserved = Number(watch(`sections.${index}.slots`)) || 0;
                        return (
                          <p className="text-xs text-muted-foreground">
                            This show will have {totalRegular + reserved} total spots: {totalRegular} regular + {reserved} guaranteed wildcard
                          </p>
                        );
                      })()}
                    </div>
                  </div>
                );
              }

              return (
                <div key={field.id} className="space-y-2">
                  <div className="flex gap-3 items-start">
                    <div className="flex-1 space-y-2">
                      <Input
                        placeholder="e.g., $5 for 5 min"
                        {...register(`sections.${index}.label`)}
                      />
                      {errors.sections?.[index]?.label && (
                        <p className="text-sm text-destructive">
                          {errors.sections[index]?.label?.message}
                        </p>
                      )}
                    </div>
                    <div className="w-24 space-y-2">
                      <Input
                        type="number"
                        min={1}
                        placeholder="Spots"
                        aria-invalid={!!sectionErrors[index] || !!errors.sections?.[index]?.slots}
                        className={cn(sectionErrors[index] && 'border-destructive')}
                        {...register(`sections.${index}.slots`, { valueAsNumber: true })}
                      />
                      {sectionErrors[index] && (
                        <p className="text-sm text-destructive">{sectionErrors[index]}</p>
                      )}
                      {errors.sections?.[index]?.slots && (
                        <p className="text-sm text-destructive">
                          {errors.sections[index]?.slots?.message}
                        </p>
                      )}
                    </div>
                    {fields.length > 1 && bookedCount === 0 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => remove(index)}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  {bookedCount > 0 && (
                    <p className="text-xs text-muted-foreground pl-1">
                      {bookedCount} spot{bookedCount !== 1 ? 's' : ''} booked
                    </p>
                  )}
                </div>
              );
            })}
          </div>

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => append({ label: '', slots: 10 })}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Section
            </Button>

            {hasFeature('wildcard') && !fields.some((_, i) => watch(`sections.${i}.type`) === 'wildcard') && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => append({ label: 'Wildcards', slots: 0, type: 'wildcard' })}
              >
                <Zap className="h-4 w-4 mr-2" />
                Add Wildcard Section
              </Button>
            )}
          </div>

          {errors.sections?.root && (
            <p className="text-sm text-destructive">{errors.sections.root.message}</p>
          )}

          {/* Allow Multiple Slots Toggle */}
          <div className="flex items-center justify-between pt-4 border-t border-border">
            <div className="space-y-0.5">
              <Label htmlFor="allowMultipleSlots">Allow multiple spots per comic</Label>
              <p className="text-sm text-muted-foreground">
                When disabled, each comic can only sign up for one spot
              </p>
            </div>
            <Switch
              id="allowMultipleSlots"
              checked={watch('allowMultipleSlots')}
              onCheckedChange={(checked) => setValue('allowMultipleSlots', checked)}
            />
          </div>
        </section>

        {/* Scheduling */}
        <section className="space-y-6">
          <h2 className="text-lg font-medium text-foreground">Scheduling</h2>

          {/* Publish Option */}
          <div className="space-y-3">
            <Label>When should this mic go live?</Label>
            <RadioGroup
              value={watchPublishOption}
              onValueChange={(value: 'now' | 'later') => setValue('publishOption', value)}
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="now" id="publish-now" />
                <Label htmlFor="publish-now" className="font-normal">Now</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="later" id="publish-later" />
                <Label htmlFor="publish-later" className="font-normal">Schedule for later</Label>
              </div>
            </RadioGroup>

            {watchPublishOption === 'later' && (
              <div className="grid grid-cols-2 gap-3 pl-6">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        'justify-start text-left font-normal',
                        !watch('publishAt') && 'text-muted-foreground'
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {watch('publishAt') ? format(watch('publishAt')!, 'PP') : 'Date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={watch('publishAt')}
                      onSelect={(date) => date && setValue('publishAt', date)}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
                <Input
                  type="time"
                  {...register('publishAtTime')}
                />
              </div>
            )}
          </div>

          {/* Signup Option */}
          <div className="space-y-3">
            <Label>When do sign-ups open?</Label>
            <RadioGroup
              value={watchSignupOption}
              onValueChange={(value: 'live' | 'later') => setValue('signupOption', value)}
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="live" id="signup-live" />
                <Label htmlFor="signup-live" className="font-normal">When mic goes live</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="later" id="signup-later" />
                <Label htmlFor="signup-later" className="font-normal">Schedule for later</Label>
              </div>
            </RadioGroup>

            {watchSignupOption === 'later' && (
              <div className="grid grid-cols-2 gap-3 pl-6">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        'justify-start text-left font-normal',
                        !watch('signupOpensAt') && 'text-muted-foreground'
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {watch('signupOpensAt') ? format(watch('signupOpensAt')!, 'PP') : 'Date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={watch('signupOpensAt')}
                      onSelect={(date) => date && setValue('signupOpensAt', date)}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
                <Input
                  type="time"
                  {...register('signupOpensAtTime')}
                />
              </div>
            )}
          </div>
        </section>

        {/* Message for Performers */}
        <section className="space-y-4">
          <h2 className="text-lg font-medium text-foreground">Message for Performers</h2>
          <p className="text-sm text-muted-foreground">
            This message will be included in all event-related emails.
          </p>

          <div className="space-y-2">
            <Label htmlFor="producerMessage">Message (optional)</Label>
            <Controller
              name="producerMessage"
              control={form.control}
              render={({ field }) => (
                <MarkdownEditor
                  value={field.value || ''}
                  onChange={field.onChange}
                  placeholder="Rules, instructions, or important notes for comedians."
                />
              )}
            />
            {errors.producerMessage && (
              <p className="text-sm text-destructive">{errors.producerMessage.message}</p>
            )}
          </div>
        </section>

        {/*
          Email Notifications Section
          Provides a clear toggle and chooses between immediate per-signup alerts or a daily summary.
        */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-medium text-foreground">Email Notifications</h2>
              <p className="text-sm text-muted-foreground">
                Get notified when someone signs up for your mic.
              </p>
            </div>
            <Switch
              id="enable-notifications"
              // Checking form state to drive the UI toggle
              checked={watch('emailFrequency') !== 'none' && !!watch('emailFrequency')}
              onCheckedChange={(checked) => {
                // Instantly update form state
                setValue('emailFrequency', checked ? 'immediate' : 'none');
              }}
            />
          </div>

          {/* Contextual Frequency Selection */}
          {(watch('emailFrequency') === 'immediate' || watch('emailFrequency') === 'daily') && (
            <div className="pl-6 space-y-3 pt-2 animate-in fade-in slide-in-from-top-1">
              <Label>Frequency</Label>
              <RadioGroup
                value={watch('emailFrequency')}
                onValueChange={(value: 'immediate' | 'daily') => {
                  setValue('emailFrequency', value);
                }}
                className="flex flex-col gap-2"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="immediate" id="notify-immediate" />
                  <Label htmlFor="notify-immediate" className="font-normal cursor-pointer">
                    Immediate <span className="text-xs text-muted-foreground ml-1 block sm:inline">(Email sent for every signup)</span>
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="daily" id="notify-daily" />
                  <Label htmlFor="notify-daily" className="font-normal cursor-pointer">
                    Daily Summary <span className="text-xs text-muted-foreground ml-1 block sm:inline">(One email per day with all activity)</span>
                  </Label>
                </div>
              </RadioGroup>
            </div>
          )}
        </section>

        {/* Actions */}
        <div className="flex flex-col gap-2 pt-4">
          <div className="flex gap-3">
            <Button
              type="button"
              variant="ghost"
              onClick={handleCancel}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={async () => {
                const isValid = await trigger();
                if (isValid) {
                  const data = form.getValues();
                  onSubmit(data, 'draft');
                } else {
                  toast({
                    title: 'Validation Error',
                    description: 'Please fix the form errors before saving.',
                    variant: 'destructive',
                  });
                }
              }}
              disabled={isSubmitting || hasBlockingSectionErrors}
            >
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save as Draft'}
            </Button>
            <Button
              type="button"
              onClick={async () => {
                const isValid = await trigger();
                if (isValid) {
                  const data = form.getValues();
                  onSubmit(data, 'published');
                } else {
                  toast({
                    title: 'Validation Error',
                    description: 'Please fix the form errors before saving.',
                    variant: 'destructive',
                  });
                }
              }}
              disabled={isSubmitting || hasBlockingSectionErrors}
            >
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save & Publish'}
            </Button>
          </div>
        </div>

        {/* Delete Section */}
        <div className="pt-8 border-t border-border">
          <Button
            type="button"
            variant="destructive"
            onClick={() => setShowDeleteDialog(true)}
            disabled={isSubmitting}
          >
            Delete Mic
          </Button>
        </div>
      </form>

      {/* Cancel Dialog */}
      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard changes?</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved changes that will be lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Editing</AlertDialogCancel>
            <AlertDialogAction onClick={handleDiscard}>
              Discard
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this mic?</AlertDialogTitle>
            <AlertDialogDescription>
              {activeBookings.length > 0
                ? `${activeBookings.length} ${activeBookings.length === 1 ? 'person' : 'people'} will be removed from the roster.`
                : 'This action cannot be undone.'
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Keep Mic</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ProducerLayout>
  );
}
