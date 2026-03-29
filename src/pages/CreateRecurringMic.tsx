import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
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
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { MarkdownEditor } from '@/components/ui/MarkdownEditor';
import { useToast } from '@/hooks/use-toast';
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

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

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
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  venueName: z.string().min(1, 'Venue name is required'),
  venueAddress: z.string().min(1, 'Venue address is required'),
  startTime: z.string().min(1, 'Start time is required'),
  endTime: z.string().min(1, 'End time is required'),
  sections: z.array(sectionSchema).min(1, 'At least one section required'),
  allowMultipleSlots: z.boolean(),
  signupOpensHoursBefore: z.number().min(0).optional(),
  recurrenceEndDate: z.date().optional(),
  isActive: z.boolean(),
  // Recurrence rule fields
  frequency: z.enum(['weekly', 'biweekly', 'monthly']),
  interval: z.number().min(1),
  days: z.array(z.number()).min(1, 'Select at least one day'),
  // Signup anchor
  signupAnchorDay: z.number().min(0).max(6).optional(),
  signupAnchorTime: z.string().optional(),
}).refine((data) => {
  if (!data.startTime || !data.endTime) return true;
  return data.startTime < data.endTime;
}, {
  message: 'End time must be after start time',
  path: ['endTime'],
});

type FormData = z.infer<typeof formSchema>;

export default function CreateRecurringMic() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { hasFeature } = useProducerFeatures();
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

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: '',
      description: '',
      venueName: producer?.venue_name || '',
      venueAddress: producer?.venue_address || '',
      startTime: '',
      endTime: '',
      sections: [{ label: '', slots: 10 }],
      allowMultipleSlots: false,
      signupOpensHoursBefore: 48,
      isActive: true,
      frequency: 'weekly',
      interval: 1,
      days: [],
      signupAnchorDay: undefined,
      signupAnchorTime: '',
    },
  });

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isDirty },
  } = form;

  useEffect(() => {
    if (producer) {
      const currentVenueName = watch('venueName');
      const currentVenueAddress = watch('venueAddress');
      if (!currentVenueName) setValue('venueName', producer.venue_name || '');
      if (!currentVenueAddress) setValue('venueAddress', producer.venue_address || '');
    }
  }, [producer, setValue, watch]);

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'sections',
  });

  const watchDays = watch('days');
  const watchRecurrenceEndDate = watch('recurrenceEndDate');

  const onSubmit = async (data: FormData) => {
    if (!user) return;
    setIsSubmitting(true);

    try {
      const sectionsConfig = data.sections.map(s => {
        if (s.type === 'wildcard') {
          return {
            label: s.label,
            slots: s.slots || 0,
            type: 'wildcard' as const,
            signup_opens_at_days_before: s.signup_opens_at_days_before,
            signup_opens_at_time: s.signup_opens_at_time,
          };
        }
        return { label: s.label, slots: s.slots };
      });

      const recurrenceRule = {
        frequency: data.frequency,
        interval: data.interval,
        days: data.days,
      };

      // Build the insert payload - using type assertion because types.ts is stale
      const insertPayload: Record<string, any> = {
        producer_id: user.id,
        title: data.title,
        description: data.description || null,
        venue_name: data.venueName,
        venue_address: data.venueAddress,
        start_time: data.startTime,
        end_time: data.endTime,
        sections_config: sectionsConfig,
        allow_multiple_slots: data.allowMultipleSlots,
        signup_opens_hours_before: data.signupOpensHoursBefore ?? 48,
        recurrence_end_date: data.recurrenceEndDate ? format(data.recurrenceEndDate, 'yyyy-MM-dd') : null,
        is_active: data.isActive,
        recurrence_rule: recurrenceRule,
        signup_anchor_day: data.signupAnchorDay ?? null,
        signup_anchor_time: data.signupAnchorTime || null,
      };

      const { error } = await (supabase.from('event_templates') as any).insert(insertPayload);

      if (error) throw error;

      toast({
        title: 'Recurring mic template created!',
        description: 'Your recurring mic has been saved.',
      });

      setShowSuccess(true);
    } catch (error: any) {
      toast({
        title: 'Error creating template',
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
      navigate('/create');
    }
  };

  if (showSuccess) {
    return (
      <ProducerLayout className="max-w-md py-12">
        <div className="text-center space-y-6">
          <div className="text-4xl">🎤</div>
          <h1 className="text-2xl font-semibold text-foreground">Recurring mic created!</h1>
          <p className="text-muted-foreground">Your template has been saved and events will be generated from it.</p>
          <div className="flex flex-col gap-3">
            <Button onClick={() => navigate('/dashboard')}>Go to Dashboard</Button>
            <Button variant="outline" onClick={() => navigate('/create')}>Create Another</Button>
          </div>
        </div>
      </ProducerLayout>
    );
  }

  return (
    <ProducerLayout className="max-w-2xl">
      <div className="flex items-center gap-4 mb-8">
        <Button variant="ghost" size="icon" onClick={() => navigate('/create')} className="-ml-2 h-8 w-8">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-2xl font-semibold text-foreground">Set Up a Recurring Mic</h1>
      </div>

      <form className="space-y-8" onSubmit={handleSubmit(onSubmit)}>
        {/* Basic Details */}
        <section className="space-y-4">
          <h2 className="text-lg font-medium text-foreground">Template Details</h2>

          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input id="title" placeholder="e.g., Tuesday Night Open Mic" {...register('title')} />
            {errors.title && <p className="text-sm text-destructive">{errors.title.message}</p>}
          </div>

          <div className="space-y-2">
            <Label>Description (optional)</Label>
            <Controller
              name="description"
              control={control}
              render={({ field }) => (
                <MarkdownEditor value={field.value || ''} onChange={field.onChange} placeholder="Details about this recurring mic..." />
              )}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startTime">Start Time *</Label>
              <Input id="startTime" type="time" {...register('startTime')} />
              {errors.startTime && <p className="text-sm text-destructive">{errors.startTime.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="endTime">End Time *</Label>
              <Input id="endTime" type="time" {...register('endTime')} />
              {errors.endTime && <p className="text-sm text-destructive">{errors.endTime.message}</p>}
            </div>
          </div>
        </section>

        {/* Venue */}
        <section className="space-y-4">
          <h2 className="text-lg font-medium text-foreground">Venue</h2>
          <div className="space-y-2">
            <Label htmlFor="venueName">Venue Name *</Label>
            <Input id="venueName" placeholder="e.g., The Comedy Store" defaultValue={producer?.venue_name || ''} {...register('venueName')} />
            {errors.venueName && <p className="text-sm text-destructive">{errors.venueName.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="venueAddress">Venue Address *</Label>
            <Input id="venueAddress" placeholder="e.g., 123 Main St, Los Angeles, CA" defaultValue={producer?.venue_address || ''} {...register('venueAddress')} />
            {errors.venueAddress && <p className="text-sm text-destructive">{errors.venueAddress.message}</p>}
          </div>
        </section>

        {/* Sections Builder — same as CreateMic */}
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
                      <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} className="text-muted-foreground hover:text-destructive h-8 w-8">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <Input placeholder="Section label (e.g., Wildcards)" {...register(`sections.${index}.label`)} />
                    <div className="space-y-2">
                      <Label className="text-sm">Wildcard cutoff</Label>
                      <div className="flex items-center gap-2">
                        <Input type="number" min={0} className="w-20" {...register(`sections.${index}.signup_opens_at_days_before`, { valueAsNumber: true })} />
                        <span className="text-sm text-muted-foreground whitespace-nowrap">days before at</span>
                        <Input type="time" className="w-32" {...register(`sections.${index}.signup_opens_at_time`)} />
                      </div>
                      {errors.sections?.[index] && (
                        <p className="text-sm text-destructive">
                          {(errors.sections[index] as any)?.signup_opens_at_days_before?.message ||
                           (errors.sections[index] as any)?.signup_opens_at_time?.message}
                        </p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm">Reserved wildcard spots</Label>
                      <Input type="number" min={0} placeholder="0" {...register(`sections.${index}.slots`, { valueAsNumber: true })} />
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
                    <Input placeholder="e.g., $5 for 5 min" {...register(`sections.${index}.label`)} />
                    {errors.sections?.[index]?.label && <p className="text-sm text-destructive">{errors.sections[index]?.label?.message}</p>}
                  </div>
                  <div className="w-24 space-y-2">
                    <Input type="number" min={1} placeholder="Spots" {...register(`sections.${index}.slots`, { valueAsNumber: true })} />
                    {errors.sections?.[index]?.slots && <p className="text-sm text-destructive">{errors.sections[index]?.slots?.message}</p>}
                  </div>
                  {fields.length > 1 && (
                    <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} className="text-muted-foreground hover:text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              );
            })}
          </div>

          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => append({ label: '', slots: 10 })}>
              <Plus className="h-4 w-4 mr-2" />Add Section
            </Button>
            {hasFeature('wildcard') && !fields.some((_, i) => watch(`sections.${i}.type`) === 'wildcard') && (
              <Button type="button" variant="outline" size="sm" onClick={() => append({ label: 'Wildcards', slots: 0, type: 'wildcard' })}>
                <Zap className="h-4 w-4 mr-2" />Add Wildcard Section
              </Button>
            )}
          </div>

          {errors.sections?.root && <p className="text-sm text-destructive">{errors.sections.root.message}</p>}

          <div className="flex items-center justify-between pt-4 border-t border-border">
            <div className="space-y-0.5">
              <Label htmlFor="allowMultipleSlots">Allow multiple spots per comic</Label>
              <p className="text-sm text-muted-foreground">When disabled, each comic can only sign up for one spot</p>
            </div>
            <Switch id="allowMultipleSlots" checked={watch('allowMultipleSlots')} onCheckedChange={(checked) => setValue('allowMultipleSlots', checked)} />
          </div>
        </section>

        {/* Recurrence Rule */}
        <section className="space-y-4">
          <h2 className="text-lg font-medium text-foreground">Recurrence Schedule</h2>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Frequency *</Label>
              <Select value={watch('frequency')} onValueChange={(val) => setValue('frequency', val as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="biweekly">Biweekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="interval">Every N occurrences</Label>
              <Input id="interval" type="number" min={1} {...register('interval', { valueAsNumber: true })} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Days of the week *</Label>
            <div className="flex flex-wrap gap-3">
              {DAY_NAMES.map((day, i) => (
                <label key={i} className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={watchDays.includes(i)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setValue('days', [...watchDays, i].sort());
                      } else {
                        setValue('days', watchDays.filter(d => d !== i));
                      }
                    }}
                  />
                  {day.slice(0, 3)}
                </label>
              ))}
            </div>
            {errors.days && <p className="text-sm text-destructive">{errors.days.message}</p>}
          </div>

          <div className="space-y-2">
            <Label>Recurrence End Date (optional)</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn('w-full justify-start text-left font-normal', !watchRecurrenceEndDate && 'text-muted-foreground')}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {watchRecurrenceEndDate ? format(watchRecurrenceEndDate, 'PPP') : 'No end date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={watchRecurrenceEndDate} onSelect={(date) => setValue('recurrenceEndDate', date || undefined)} initialFocus className="pointer-events-auto" />
              </PopoverContent>
            </Popover>
          </div>
        </section>

        {/* Signup Scheduling */}
        <section className="space-y-4">
          <h2 className="text-lg font-medium text-foreground">Signup Scheduling</h2>

          <div className="space-y-2">
            <Label htmlFor="signupOpensHoursBefore">Sign-ups open hours before event</Label>
            <Input id="signupOpensHoursBefore" type="number" min={0} {...register('signupOpensHoursBefore', { valueAsNumber: true })} />
            <p className="text-sm text-muted-foreground">How many hours before the event sign-ups open (default 48)</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Signup anchor day (optional)</Label>
              <Select value={watch('signupAnchorDay')?.toString() ?? ''} onValueChange={(val) => setValue('signupAnchorDay', val ? parseInt(val) : undefined)}>
                <SelectTrigger><SelectValue placeholder="Select day" /></SelectTrigger>
                <SelectContent>
                  {DAY_NAMES.map((day, i) => (
                    <SelectItem key={i} value={i.toString()}>{day}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">The specific day of week sign-ups open</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="signupAnchorTime">Signup anchor time (optional)</Label>
              <Input id="signupAnchorTime" type="time" {...register('signupAnchorTime')} />
              <p className="text-sm text-muted-foreground">The specific time sign-ups open on anchor day</p>
            </div>
          </div>
        </section>

        {/* Active Toggle */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="isActive">Active</Label>
              <p className="text-sm text-muted-foreground">When active, events will be generated from this template</p>
            </div>
            <Switch id="isActive" checked={watch('isActive')} onCheckedChange={(checked) => setValue('isActive', checked)} />
          </div>
        </section>

        {/* Actions */}
        <div className="flex gap-3 pt-4">
          <Button type="button" variant="ghost" onClick={handleCancel} disabled={isSubmitting}>Cancel</Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create Template'}
          </Button>
        </div>
      </form>

      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard changes?</AlertDialogTitle>
            <AlertDialogDescription>You have unsaved changes that will be lost.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Editing</AlertDialogCancel>
            <AlertDialogAction onClick={() => navigate('/create')}>Discard</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ProducerLayout>
  );
}
