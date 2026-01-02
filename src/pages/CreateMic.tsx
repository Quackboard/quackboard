import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { fromZonedTime } from 'date-fns-tz';
import { CalendarIcon, Plus, Trash2, Loader2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

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
import { useToast } from '@/hooks/use-toast';
import { useFormDraft } from '@/hooks/useFormDraft';
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
  slots: z.number().min(1, 'At least 1 spot required'),
});

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
}).refine((data) => {
  if (data.signupOption === 'later' && data.signupOpensAt && data.signupOpensAtTime) {
    const signupDateTime = combineDateAndTime(data.signupOpensAt, data.signupOpensAtTime);
    return signupDateTime > new Date();
  }
  return true;
}, {
  message: 'Signup time must be in the future',
  path: ['signupOpensAt'],
}).refine((data) => {
  if (data.publishOption === 'later' && data.signupOption === 'later') {
    if (!data.publishAt || !data.publishAtTime || !data.signupOpensAt || !data.signupOpensAtTime) return true;
    const publishDateTime = combineDateAndTime(data.publishAt, data.publishAtTime);
    const signupDateTime = combineDateAndTime(data.signupOpensAt, data.signupOpensAtTime);
    return signupDateTime >= publishDateTime;
  }
  return true;
}, {
  message: 'Signup time must be on or after publish time',
  path: ['signupOpensAt'],
}).refine((data) => {
  // Check signup opens before event starts
  if (data.signupOption === 'later' && data.date && data.startTime && data.signupOpensAt && data.signupOpensAtTime) {
    const eventStartDateTime = combineDateAndTime(data.date, data.startTime);
    const signupDateTime = combineDateAndTime(data.signupOpensAt, data.signupOpensAtTime);
    return signupDateTime < eventStartDateTime;
  }
  return true;
}, {
  message: 'Sign-ups must open before the mic starts',
  path: ['signupOpensAt'],
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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);

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
      // Build sections config
      const sectionsConfig = data.sections.map(s => ({
        label: s.label,
        slots: s.slots,
      }));

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

      const seriesId = crypto.randomUUID();

      const { error } = await supabase.from('events').insert({
        producer_id: user.id,
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
        series_id: seriesId,
      });

      if (error) throw error;

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
    <ProducerLayout className="max-w-xl">
      <h1 className="text-2xl font-semibold text-foreground mb-8">Create Mic</h1>

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
            {fields.map((field, index) => (
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
            ))}
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => append({ label: '', slots: 10 })}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Section
          </Button>

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
