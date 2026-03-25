import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { fromZonedTime } from 'date-fns-tz';
import { CalendarIcon, Plus, Trash2, Loader2, ArrowLeft, Zap } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

import { ProducerLayout } from '@/components/layouts/ProducerLayout';
import { useAuth } from '@/contexts/AuthContext';
import { useProducerFeatures } from '@/hooks/useProducerFeatures';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { MarkdownEditor } from '@/components/ui/MarkdownEditor';
import { useToast } from '@/hooks/use-toast';
import { useFormDraft } from '@/hooks/useFormDraft';
import { sendMicGoesLiveEmail } from '@/lib/email';
import { RecurrenceSelector, RecurrenceConfig, generateRecurringDates } from '@/components/ui/RecurrenceSelector';
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

const CREATE_MIC_DRAFT_KEY = 'quackboard_create_mic_draft';

const sectionSchema = z.object({
  label: z.string(),
  slots: z.number().min(0),
  type: z.enum(['regular', 'wildcard']).optional(),
  signup_opens_at_days_before: z.number().min(0).optional(),
  signup_opens_at_time: z.string().optional(),
}).refine((data) => {
  if (data.type === 'wildcard') return true;
  return data.slots >= 1;
}, { message: 'At least 1 spot required', path: ['slots'] }).refine((data) => {
  if (data.type === 'wildcard' && (data.signup_opens_at_days_before === undefined || data.signup_opens_at_days_before === null)) return false;
  return true;
}, { message: 'Days before is required', path: ['signup_opens_at_days_before'] }).refine((data) => {
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
  signupDaysBefore: z.number().min(0).optional(),
  signupOpensAtTime: z.string().optional(),
  producerMessage: z.string().refine(val => (val.trim() ? val.trim().split(/\s+/).length : 0) <= 500, 'Message limit reached (500 words)').optional(),
  emailFrequency: z.enum(['none', 'immediate', 'daily']).optional(),
}).refine((data) => {
  if (!data.startTime || !data.endTime) return true;
  return data.startTime < data.endTime;
}, {
  message: 'End time must be after start time',
  path: ['endTime'],
}).refine((data) => {
  if (data.publishOption === 'later') {
    if (!data.publishAt) return false;
  }
  return true;
}, {
  message: 'Please select a publish date',
  path: ['publishAt'],
}).refine((data) => {
  if (data.publishOption === 'later') {
    if (!data.publishAtTime) return false;
  }
  return true;
}, {
  message: 'Please select a publish time',
  path: ['publishAtTime'],
}).refine((data) => {
  if (data.publishOption === 'later' && data.publishAt && data.publishAtTime) {
    const publishDateTime = combineDateAndTime(data.publishAt, data.publishAtTime);
    return publishDateTime > new Date();
  }
  return true;
}, {
  message: 'Publish time must be in the future',
  path: ['publishAt'],
}).refine((data) => {
  if (data.signupOption === 'later') {
    if (data.signupDaysBefore === undefined || data.signupDaysBefore === null) return false;
  }
  return true;
}, {
  message: 'Please specify days before',
  path: ['signupDaysBefore'],
}).refine((data) => {
  if (data.signupOption === 'later') {
    if (!data.signupOpensAtTime) return false;
  }
  return true;
}, {
  message: 'Please select a signup time',
  path: ['signupOpensAtTime'],
}).refine((data) => {
  // If 0 days before, signup time must be before event start time
  if (data.signupOption === 'later' && data.signupDaysBefore === 0 && data.signupOpensAtTime && data.startTime) {
    return data.signupOpensAtTime < data.startTime;
  }
  return true;
}, {
  message: 'Sign-ups must open before the mic starts',
  path: ['signupOpensAtTime'],
});

function combineDateAndTime(date: Date, time: string): Date {
  const [hours, minutes] = time.split(':').map(Number);
  const combined = new Date(date);
  combined.setHours(hours, minutes, 0, 0);
  return combined;
}

type FormData = z.infer<typeof formSchema>;

export default function CreateMic() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { hasFeature } = useProducerFeatures();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [recurrence, setRecurrence] = useState<RecurrenceConfig | null>(null);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);

  const { data: producer } = useQuery({
    queryKey: ['producer-profile', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('producers')
        .select('venue_name, venue_address, timezone')
        .eq('id', user!.id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const timezone = producer?.timezone || 'America/Los_Angeles';

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      sections: [{ label: '', slots: 10 }],
      allowMultipleSlots: false,
      publishOption: 'now',
      signupOption: 'live',
      venueName: producer?.venue_name || '',
      venueAddress: producer?.venue_address || '',
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
    formState: { errors, isDirty },
  } = form;

  const { clearDraft } = useFormDraft({
    form,
    storageKey: CREATE_MIC_DRAFT_KEY,
  });

  // Update venue defaults when producer data loads (only if not restored from draft)
  useEffect(() => {
    if (producer) {
      const currentVenueName = watch('venueName');
      const currentVenueAddress = watch('venueAddress');
      // Only set defaults if fields are empty (not restored from draft)
      if (!currentVenueName) {
        setValue('venueName', producer.venue_name || '');
      }
      if (!currentVenueAddress) {
        setValue('venueAddress', producer.venue_address || '');
      }
    }
  }, [producer, setValue, watch]);

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'sections',
  });

  const watchPublishOption = watch('publishOption');
  const watchSignupOption = watch('signupOption');
  const watchDate = watch('date');

  const onSubmit = async (data: FormData, status: 'draft' | 'published') => {
    if (!user) return;

    setIsSubmitting(true);

    try {
      // Build sections config as a function of event date (for per-event wildcard cutoff)
      const buildSectionsConfig = (eventDateStr: string) => data.sections.map(s => {
        if (s.type === 'wildcard' && s.signup_opens_at_days_before !== undefined && s.signup_opens_at_time) {
          const eventDate = new Date(eventDateStr + 'T00:00:00');
          const cutoffDate = new Date(eventDate);
          cutoffDate.setDate(cutoffDate.getDate() - s.signup_opens_at_days_before);
          const [h, m] = s.signup_opens_at_time.split(':').map(Number);
          cutoffDate.setHours(h, m, 0, 0);
          const utcCutoff = fromZonedTime(cutoffDate, timezone).toISOString();
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

      // Helper to compute signup_opens_at per event date
      const computeSignupOpensAt = (eventDateStr: string): string | null => {
        if (data.signupOption !== 'later' || data.signupDaysBefore === undefined || !data.signupOpensAtTime) return null;
        const eventDate = new Date(eventDateStr + 'T00:00:00');
        const signupDate = new Date(eventDate);
        signupDate.setDate(signupDate.getDate() - data.signupDaysBefore);
        const [h, m] = data.signupOpensAtTime.split(':').map(Number);
        signupDate.setHours(h, m, 0, 0);
        return fromZonedTime(signupDate, timezone).toISOString();
      };

      const seriesId = crypto.randomUUID();

      // If recurrence is set, generate multiple events
      if (recurrence && endDate && data.startTime && data.endTime) {
        const recurringDates = generateRecurringDates({
          startDate: data.date,
          endDate,
          startTime: data.startTime,
          dailyEndTime: data.endTime,
          recurrence,
        });

        const eventsToInsert = recurringDates.map(dateObj => {
          const endTimeObj = new Date(dateObj);
          const [endH, endM] = data.endTime.split(':').map(Number);
          // keep same duration as original
          const [startH, startM] = data.startTime.split(':').map(Number);
          const durationMs = (endH * 60 + endM - startH * 60 - startM) * 60000;
          const endTimeDate = new Date(dateObj.getTime() + durationMs);

          return {
            producer_id: user.id,
            date: format(dateObj, 'yyyy-MM-dd'),
            start_time: format(dateObj, 'HH:mm'),
            end_time: format(endTimeDate, 'HH:mm'),
            title: data.title || `Mic on ${format(dateObj, 'MMM d')}`,
            venue_name: data.venueName,
            venue_address: data.venueAddress,
            sections_config: buildSectionsConfig(format(dateObj, 'yyyy-MM-dd')),
            allow_multiple_slots: data.allowMultipleSlots,
            status,
            publish_at: publishAt,
            signup_opens_at: computeSignupOpensAt(format(dateObj, 'yyyy-MM-dd')),
            series_id: seriesId,
            email_frequency: data.emailFrequency === 'none' ? 'disabled' : (data.emailFrequency || 'disabled'),
            producer_message: data.producerMessage || null,
          };
        });

        const { data: createdEvents, error } = await supabase.from('events').insert(eventsToInsert).select('id, date, start_time').order('date', { ascending: true }).order('start_time', { ascending: true });
        if (error) throw error;
        if (!createdEvents || createdEvents.length === 0) throw new Error('Failed to create events');

        // HOURLY/RECURRING EMAIL FIX: Send/Schedule exactly 1 email for the first mic in the series
        // createdEvents is ordered by date ascending so [0] is guaranteed to be the earliest mic
        if (status === 'published') {
          const firstEventId = createdEvents[0].id;
          if (data.publishOption === 'now') {
            await sendMicGoesLiveEmail({
              eventId: firstEventId,
              producerId: user.id,
            });
          } else if (data.publishOption === 'later' && publishAt) {
            const { error: scheduleError } = await supabase.from('scheduled_messages').insert({
              producer_id: user.id,
              event_id: firstEventId,
              subject: `Your mic series "${data.title || 'mic'}" is now live!`,
              body_markdown: `Your recurring mic series starting with "${data.title || format(recurringDates[0], 'MMM d')}" is now live/scheduled.`,
              send_at: publishAt,
              status: 'pending',
            });
            if (scheduleError) console.error('Error scheduling recurring mic email:', scheduleError);
          }
        }

        toast({
          title: `${eventsToInsert.length} mics created!`,
          description: `Recurring mics scheduled (${recurrence.label}).`,
        });

        clearDraft();
        setShowSuccess(true);
        return;
      }

      const { data: createdEvent, error } = await supabase.from('events').insert({
        producer_id: user.id,
        date: format(data.date, 'yyyy-MM-dd'),
        start_time: data.startTime,
        end_time: data.endTime,
        title: data.title || `Mic on ${format(data.date, 'MMM d')}`,
        venue_name: data.venueName,
        venue_address: data.venueAddress,
        sections_config: buildSectionsConfig(format(data.date, 'yyyy-MM-dd')),
        allow_multiple_slots: data.allowMultipleSlots,
        status,
        publish_at: publishAt,
        signup_opens_at: computeSignupOpensAt(format(data.date, 'yyyy-MM-dd')),
        series_id: seriesId,
        // Explicit mapping to 'disabled' for backend clarity
        email_frequency: data.emailFrequency === 'none' ? 'disabled' : (data.emailFrequency || 'disabled'),
        producer_message: data.producerMessage || null,
      }).select('id').single();

      if (error) throw error;
      if (!createdEvent) throw new Error('Failed to create event');

      // Handle email notification based on publish option
      if (status === 'published') {
        if (data.publishOption === 'now') {
          // Send email immediately
          await sendMicGoesLiveEmail({
            eventId: createdEvent.id,
            producerId: user.id,
          });
        } else if (data.publishOption === 'later' && publishAt) {
          // Schedule email to be sent when mic goes live (at publish_at time)
          // Store in scheduled_messages table
          const { error: scheduleError } = await supabase.from('scheduled_messages').insert({
            producer_id: user.id,
            event_id: createdEvent.id,
            subject: `Your mic "${data.title || `Mic on ${format(data.date, 'MMM d')}`}" is now live!`,
            body_markdown: `Your mic "${data.title || `Mic on ${format(data.date, 'MMM d')}`}" is now live and accepting sign-ups.`,
            send_at: publishAt,
            status: 'pending',
          });

          if (scheduleError) {
            console.error('Error scheduling mic goes live email:', scheduleError);
            // Don't throw - scheduling email failure shouldn't break mic creation
          }
        }
      }

      toast({
        title: 'Mic created!',
        description: status === 'draft' ? 'Saved as draft.' : 'Your mic is now live.',
      });

      clearDraft();
      setShowSuccess(true);
    } catch (error: any) {
      toast({
        title: 'Error creating mic',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateAnother = () => {
    clearDraft();
    // Keep date, venue, sections, scheduling - only clear times
    setValue('startTime', '');
    setValue('endTime', '');
    setValue('title', '');
    setShowSuccess(false);
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

  if (showSuccess) {
    return (
      <ProducerLayout className="max-w-md py-12">
        <div className="text-center space-y-6">
          <div className="text-4xl">🎤</div>
          <h1 className="text-2xl font-semibold text-foreground">Mic created!</h1>
          <div className="flex flex-col gap-3">
            <Button onClick={() => navigate('/dashboard')}>
              Go to Dashboard
            </Button>
            <Button variant="outline" onClick={handleCreateAnother}>
              Create Another Time
            </Button>
          </div>
        </div>
      </ProducerLayout>
    );
  }

  return (
    <ProducerLayout className="max-w-2xl">
      <div className="flex items-center gap-4 mb-8">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate('/dashboard')}
          className="-ml-2 h-8 w-8"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-2xl font-semibold text-foreground">Create Mic</h1>
      </div>

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

          <RecurrenceSelector
            value={recurrence}
            onChange={setRecurrence}
            endDate={endDate}
            onEndDateChange={setEndDate}
            // Pass real-time form values to power the preview list
            startDate={watchDate}
            startTime={watch('startTime')}
            endTime={watch('endTime')}
          />
            </section>

            {/* Venue */}
            <section className="space-y-4">
              <h2 className="text-lg font-medium text-foreground">Venue</h2>

              <div className="space-y-2">
                <Label htmlFor="venueName">Venue Name *</Label>
                <Input
                  id="venueName"
                  placeholder="e.g., The Comedy Store"
                  defaultValue={producer?.venue_name || ''}
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
                  defaultValue={producer?.venue_address || ''}
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

                  if (isWildcard) {
                    return (
                      <div key={field.id} className="space-y-3 rounded-lg border border-primary/30 bg-primary/5 p-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Zap className="h-4 w-4 text-primary" />
                            <span className="text-sm font-medium text-foreground">Wildcard Section</span>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => remove(index)}
                            className="text-muted-foreground hover:text-destructive h-8 w-8"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
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
                                This show will have {totalRegular + reserved} total spots: {totalRegular} regular + {reserved} guaranteed wildcard. Any unfilled regular spots will be added to the wildcard section.
                              </p>
                            );
                          })()}
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div key={field.id} className="flex gap-3 items-start">
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
                          {...register(`sections.${index}.slots`, { valueAsNumber: true })}
                        />
                        {errors.sections?.[index]?.slots && (
                          <p className="text-sm text-destructive">
                            {errors.sections[index]?.slots?.message}
                          </p>
                        )}
                      </div>
                      {fields.length > 1 && (
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
                    {errors.publishAt && (
                      <p className="text-sm text-destructive col-span-2">{errors.publishAt.message}</p>
                    )}
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
                  <div className="space-y-3 pl-6">
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min={0}
                        className="w-20"
                        {...register('signupDaysBefore', { valueAsNumber: true })}
                      />
                      <span className="text-sm text-muted-foreground whitespace-nowrap">days before at</span>
                      <Input
                        type="time"
                        className="w-32"
                        {...register('signupOpensAtTime')}
                      />
                    </div>
                    {watchDate && watch('signupDaysBefore') !== undefined && watch('signupOpensAtTime') && (
                      <p className="text-xs text-muted-foreground">
                        Sign-ups will open {watch('signupDaysBefore')} day{watch('signupDaysBefore') !== 1 ? 's' : ''} before each event at {watch('signupOpensAtTime')}
                      </p>
                    )}
                    {errors.signupDaysBefore && (
                      <p className="text-sm text-destructive">{errors.signupDaysBefore.message}</p>
                    )}
                    {errors.signupOpensAtTime && (
                      <p className="text-sm text-destructive">{errors.signupOpensAtTime.message}</p>
                    )}
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
                  // Mapping: 'none' or falsy turns the switch off.
                  checked={watch('emailFrequency') !== 'none' && !!watch('emailFrequency')}
                  onCheckedChange={(checked) => {
                    // Default to 'immediate' when toggled ON for the best user experience.
                    setValue('emailFrequency', checked ? 'immediate' : 'none');
                  }}
                />
              </div>

              {/* Only show frequency options if notifications are enabled */}
              {(watch('emailFrequency') === 'immediate' || watch('emailFrequency') === 'daily') && (
                <div className="pl-6 space-y-3 pt-2 animate-in fade-in slide-in-from-top-1">
                  <Label>Frequency</Label>
                  <RadioGroup
                    value={watch('emailFrequency')}
                    onValueChange={(value: 'immediate' | 'daily') => {
                      // Explicitly cast and sanitize the selection
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
            <div className="flex gap-3 pt-4">
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
                onClick={handleSubmit((data) => onSubmit(data, 'draft'))}
                disabled={isSubmitting}
              >
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save as Draft'}
              </Button>
              <Button
                type="button"
                onClick={handleSubmit((data) => onSubmit(data, 'published'))}
                disabled={isSubmitting}
              >
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Publish'}
              </Button>
            </div>
      </form>

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
    </ProducerLayout>
  );
}
