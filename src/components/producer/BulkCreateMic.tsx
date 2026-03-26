import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format, addHours, addDays, addWeeks } from 'date-fns';
import { fromZonedTime } from 'date-fns-tz';
import { CalendarIcon, Clock, Loader2, Plus, Minus } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

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
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MarkdownEditor } from '@/components/ui/MarkdownEditor';
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

const formSchema = z.object({
  // Basic event details
  title: z.string().optional(),
  venueName: z.string().min(1, 'Venue name is required'),
  venueAddress: z.string().min(1, 'Venue address is required'),
  slotsPerMic: z.number().min(1, 'At least 1 slot required'),
  producerMessage: z.string().max(4000, 'Message is too long').optional(),

  // Recurrence settings
  startDate: z.date({
    required_error: 'Start date is required',
    invalid_type_error: 'Please select a valid date',
  }),
  startTime: z.string().min(1, 'Start time is required'),
  durationMinutes: z.number().min(15, 'Duration must be at least 15 minutes'),
  frequency: z.enum(['hourly', 'daily', 'weekly']),
  endDate: z.date({
    required_error: 'End date is required',
    invalid_type_error: 'Please select a valid date',
  }),

  // Scheduling options
  allowMultipleSlots: z.boolean(),
  signupOption: z.enum(['live', 'later']),
  signupOpensAt: z.date({ invalid_type_error: 'Please select a valid date' }).optional(),
  signupOpensAtTime: z.string().optional(),
}).refine((data) => {
  return data.startDate <= data.endDate;
}, {
  message: 'End date must be on or after start date',
  path: ['endDate'],
}).refine((data) => {
  if (data.signupOption === 'later') {
    if (!data.signupOpensAt) return false;
  }
  return true;
}, {
  message: 'Please select a signup date',
  path: ['signupOpensAt'],
}).refine((data) => {
  if (data.signupOption === 'later') {
    if (!data.signupOpensAtTime) return false;
  }
  return true;
}, {
  message: 'Please select a signup time',
  path: ['signupOpensAtTime'],
});

function combineDateAndTime(date: Date, time: string): Date {
  const [hours, minutes] = time.split(':').map(Number);
  const combined = new Date(date);
  combined.setHours(hours, minutes, 0, 0);
  return combined;
}

type FormData = z.infer<typeof formSchema>;

export default function BulkCreateMic() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [generatedEvents, setGeneratedEvents] = useState<any[]>([]);
  const [showSuccess, setShowSuccess] = useState(false);

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
      slotsPerMic: 10,
      durationMinutes: 60,
      frequency: 'hourly',
      allowMultipleSlots: false,
      signupOption: 'live',
      venueName: producer?.venue_name || '',
      venueAddress: producer?.venue_address || '',
      producerMessage: '',
    },
  });

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = form;

  const watchStartDate = watch('startDate');
  const watchStartTime = watch('startTime');
  const watchDurationMinutes = watch('durationMinutes');
  const watchFrequency = watch('frequency');
  const watchEndDate = watch('endDate');
  const watchSignupOption = watch('signupOption');

  // Update venue defaults when producer data loads
  useEffect(() => {
    if (producer) {
      const currentVenueName = watch('venueName');
      const currentVenueAddress = watch('venueAddress');
      if (!currentVenueName) {
        setValue('venueName', producer.venue_name || '');
      }
      if (!currentVenueAddress) {
        setValue('venueAddress', producer.venue_address || '');
      }
    }
  }, [producer, setValue, watch]);

  // Generate preview of events
  useEffect(() => {
    if (watchStartDate && watchStartTime && watchEndDate && watchFrequency && watchDurationMinutes) {
      try {
        const events = generateEventsPreview({
          startDate: watchStartDate,
          startTime: watchStartTime,
          endDate: watchEndDate,
          frequency: watchFrequency,
          durationMinutes: watchDurationMinutes,
          title: watch('title') || 'Mic',
        });
        setGeneratedEvents(events);
      } catch (error) {
        setGeneratedEvents([]);
      }
    }
  }, [watchStartDate, watchStartTime, watchEndDate, watchFrequency, watchDurationMinutes, watch]);

  function generateEventsPreview({
    startDate,
    startTime,
    endDate,
    frequency,
    durationMinutes,
    title
  }: {
    startDate: Date;
    startTime: string;
    endDate: Date;
    frequency: 'hourly' | 'daily' | 'weekly';
    durationMinutes: number;
    title: string;
  }) {
    const events = [];
    const [startHours, startMinutes] = startTime.split(':').map(Number);
    const startDateTime = new Date(startDate);
    startDateTime.setHours(startHours, startMinutes, 0, 0);

    let currentDateTime = new Date(startDateTime);
    const endDateTime = new Date(endDate);
    endDateTime.setHours(23, 59, 59, 999);

    while (currentDateTime <= endDateTime) {
      const eventEndTime = new Date(currentDateTime);
      eventEndTime.setMinutes(eventEndTime.getMinutes() + durationMinutes);

      events.push({
        date: format(currentDateTime, 'yyyy-MM-dd'),
        startTime: format(currentDateTime, 'HH:mm'),
        endTime: format(eventEndTime, 'HH:mm'),
        title: `${title} - ${format(currentDateTime, 'MMM d, h:mm a')}`,
      });

      // Move to next event based on frequency
      if (frequency === 'hourly') {
        currentDateTime = addHours(currentDateTime, 1);
      } else if (frequency === 'daily') {
        currentDateTime = addDays(currentDateTime, 1);
        currentDateTime.setHours(startHours, startMinutes, 0, 0);
      } else if (frequency === 'weekly') {
        currentDateTime = addWeeks(currentDateTime, 1);
        currentDateTime.setHours(startHours, startMinutes, 0, 0);
      }
    }

    return events;
  }

  const onSubmit = async (data: FormData) => {
    setGeneratedEvents(generateEventsPreview({
      startDate: data.startDate,
      startTime: data.startTime,
      endDate: data.endDate,
      frequency: data.frequency,
      durationMinutes: data.durationMinutes,
      title: data.title || 'Mic',
    }));
    setShowConfirmDialog(true);
  };

  const handleCreateEvents = async () => {
    if (!user) return;

    setIsSubmitting(true);
    setShowConfirmDialog(false);

    try {
      const data = form.getValues();
      const seriesId = crypto.randomUUID();

      // publish_at is no longer written from the frontend
      const publishAt: string | null = null;

      // Handle signup_opens_at
      let signupOpensAt: string | null = null;
      if (data.signupOption === 'later' && data.signupOpensAt && data.signupOpensAtTime) {
        const localDateTime = combineDateAndTime(data.signupOpensAt, data.signupOpensAtTime);
        signupOpensAt = fromZonedTime(localDateTime, timezone).toISOString();
      }

      const eventsToInsert = generatedEvents.map(event => ({
        producer_id: user.id,
        date: event.date,
        start_time: event.startTime,
        end_time: event.endTime,
        title: event.title,
        venue_name: data.venueName,
        venue_address: data.venueAddress,
        sections_config: [{ label: '$5 for 5 min', slots: data.slotsPerMic }],
        allow_multiple_slots: data.allowMultipleSlots,
        status: 'published' as const,
        publish_at: publishAt,
        signup_opens_at: signupOpensAt,
        series_id: seriesId,
        producer_message: data.producerMessage || null,
      }));

      const { error } = await supabase.from('events').insert(eventsToInsert);

      if (error) throw error;

      toast({
        title: `Created ${eventsToInsert.length} mics!`,
        description: 'Your recurring mics have been scheduled.',
      });

      setShowSuccess(true);
    } catch (error: any) {
      toast({
        title: 'Error creating mics',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (showSuccess) {
    return (
      <div className="text-center space-y-6">
        <div className="text-4xl">🎤</div>
        <h1 className="text-2xl font-semibold text-foreground">Mics created!</h1>
        <p className="text-muted-foreground">
          Successfully created {generatedEvents.length} recurring mics.
        </p>
        <div className="flex flex-col gap-3">
          <Button onClick={() => navigate('/dashboard')}>
            Go to Dashboard
          </Button>
          <Button variant="outline" onClick={() => {
            setShowSuccess(false);
            setGeneratedEvents([]);
            form.reset();
          }}>
            Create More Mics
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <form className="space-y-8" onSubmit={handleSubmit(onSubmit)}>
        {/* Basic Event Details */}
        <section className="space-y-4">
          <h2 className="text-lg font-medium text-foreground">Basic Details</h2>

          <div className="space-y-2">
            <Label htmlFor="bulk-title">Title (optional)</Label>
            <Input
              id="bulk-title"
              placeholder="e.g., Open Mic Night"
              {...register('title')}
            />
            <p className="text-sm text-muted-foreground">
              This will be used as a base title for all mics
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="bulk-venueName">Venue Name *</Label>
              <Input
                id="bulk-venueName"
                placeholder="e.g., The Comedy Store"
                {...register('venueName')}
              />
              {errors.venueName && (
                <p className="text-sm text-destructive">{errors.venueName.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="bulk-slotsPerMic">Slots per Mic *</Label>
              <Input
                id="bulk-slotsPerMic"
                type="number"
                min={1}
                {...register('slotsPerMic', { valueAsNumber: true })}
              />
              {errors.slotsPerMic && (
                <p className="text-sm text-destructive">{errors.slotsPerMic.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="bulk-venueAddress">Venue Address *</Label>
            <Input
              id="bulk-venueAddress"
              placeholder="e.g., 123 Main St, Los Angeles, CA"
              {...register('venueAddress')}
            />
            {errors.venueAddress && (
              <p className="text-sm text-destructive">{errors.venueAddress.message}</p>
            )}
          </div>
        </section>

        {/* Recurrence Settings */}
        <section className="space-y-4">
          <h2 className="text-lg font-medium text-foreground">Recurrence Schedule</h2>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Start Date *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !watchStartDate && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {watchStartDate ? format(watchStartDate, 'PPP') : 'Pick start date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={watchStartDate}
                    onSelect={(date) => date && setValue('startDate', date)}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
              {errors.startDate && (
                <p className="text-sm text-destructive">{errors.startDate.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>End Date *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !watchEndDate && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {watchEndDate ? format(watchEndDate, 'PPP') : 'Pick end date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={watchEndDate}
                    onSelect={(date) => date && setValue('endDate', date)}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
              {errors.endDate && (
                <p className="text-sm text-destructive">{errors.endDate.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="bulk-startTime">Start Time *</Label>
              <Input
                id="bulk-startTime"
                type="time"
                {...register('startTime')}
              />
              {errors.startTime && (
                <p className="text-sm text-destructive">{errors.startTime.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="bulk-durationMinutes">Duration (minutes) *</Label>
              <Input
                id="bulk-durationMinutes"
                type="number"
                min={15}
                {...register('durationMinutes', { valueAsNumber: true })}
              />
              {errors.durationMinutes && (
                <p className="text-sm text-destructive">{errors.durationMinutes.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Frequency *</Label>
              <Select
                value={watchFrequency}
                onValueChange={(value: 'hourly' | 'daily' | 'weekly') => setValue('frequency', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hourly">Hourly</SelectItem>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </section>

        {/* Allow Multiple Slots Toggle */}
        <div className="flex items-center justify-between pt-4 border-t border-border">
          <div className="space-y-0.5">
            <Label htmlFor="bulk-allowMultipleSlots">Allow multiple spots per comic</Label>
            <p className="text-sm text-muted-foreground">
              When disabled, each comic can only sign up for one spot per mic
            </p>
          </div>
          <Switch
            id="bulk-allowMultipleSlots"
            checked={watch('allowMultipleSlots')}
            onCheckedChange={(checked) => setValue('allowMultipleSlots', checked)}
          />
        </div>

        {/* Scheduling Options */}
        <section className="space-y-6">
          <h2 className="text-lg font-medium text-foreground">Scheduling</h2>

          {/* Signup Option */}
          <div className="space-y-3">
            <Label>When do sign-ups open?</Label>
            <RadioGroup
              value={watchSignupOption}
              onValueChange={(value: 'live' | 'later') => setValue('signupOption', value)}
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="live" id="bulk-signup-live" />
                <Label htmlFor="bulk-signup-live" className="font-normal">When mic goes live</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="later" id="bulk-signup-later" />
                <Label htmlFor="bulk-signup-later" className="font-normal">Schedule for later</Label>
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
                {errors.signupOpensAt && (
                  <p className="text-sm text-destructive col-span-2">{errors.signupOpensAt.message}</p>
                )}
              </div>
            )}
          </div>
        </section>

        {/* Producer Message */}
        <section className="space-y-4">
          <h2 className="text-lg font-medium text-foreground">Message (optional)</h2>
          <MarkdownEditor
            value={watch('producerMessage') || ''}
            onChange={(value) => setValue('producerMessage', value)}
            placeholder="Rules, instructions, or important notes for comedians."
          />
          <p className="text-sm text-muted-foreground">
            This message will be shown to comedians when they view this mic
          </p>
          {errors.producerMessage && (
            <p className="text-sm text-destructive">{errors.producerMessage.message}</p>
          )}
        </section>

        {/* Preview */}
        {generatedEvents.length > 0 && (
          <section className="space-y-4">
            <h2 className="text-lg font-medium text-foreground">Preview ({generatedEvents.length} mics)</h2>
            <div className="max-h-48 overflow-y-auto border rounded-lg p-4 bg-muted/30">
              <div className="space-y-2">
                {generatedEvents.slice(0, 10).map((event, index) => (
                  <div key={index} className="flex items-center justify-between text-sm">
                    <span className="font-medium">{event.title}</span>
                    <span className="text-muted-foreground">{event.startTime} - {event.endTime}</span>
                  </div>
                ))}
                {generatedEvents.length > 10 && (
                  <p className="text-sm text-muted-foreground text-center pt-2">
                    ... and {generatedEvents.length - 10} more mics
                  </p>
                )}
              </div>
            </div>
          </section>
        )}

        {/* Actions */}
        <div className="flex gap-3 pt-4">
          <Button
            type="submit"
            disabled={generatedEvents.length === 0 || isSubmitting}
          >
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Review & Create'}
          </Button>
        </div>
      </form>

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Create {generatedEvents.length} Mics?</AlertDialogTitle>
            <AlertDialogDescription>
              This will create {generatedEvents.length} recurring mics based on your settings.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleCreateEvents}>
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Create Mics
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
