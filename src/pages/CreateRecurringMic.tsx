import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format, addDays, startOfDay, getDay, getDate, setDate, setDay, isBefore, isAfter, startOfMonth, addMonths, lastDayOfMonth } from 'date-fns';
import { CalendarIcon, Plus, Trash2, Loader2, ArrowLeft, Zap, ChevronDown } from 'lucide-react';
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
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
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
const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const OCCURRENCE_LABELS = ['1st', '2nd', '3rd', '4th', 'Last'];
const DATE_NUMBERS = Array.from({ length: 31 }, (_, i) => i + 1);

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
  producerMessage: z.string().optional(),
  venueName: z.string().min(1, 'Venue name is required'),
  venueAddress: z.string().min(1, 'Venue address is required'),
  startTime: z.string().min(1, 'Start time is required'),
  endTime: z.string().min(1, 'End time is required'),
  sections: z.array(sectionSchema).min(1, 'At least one section required'),
  allowMultipleSlots: z.boolean(),
  recurrenceEndDate: z.date().optional(),
  isActive: z.boolean(),
  // Frequency
  frequency: z.enum(['every_week', 'every_other_week', 'monthly_by_date', 'monthly_by_day', 'hourly']),
  // Weekly/biweekly/hourly day picks
  days: z.array(z.number()).optional(),
  // Monthly by date
  monthlyDate: z.number().min(1).max(31).optional(),
  // Monthly by day
  monthlyOccurrence: z.enum(['1', '2', '3', '4', 'last']).optional(),
  monthlyDayOfWeek: z.number().min(0).max(6).optional(),
  // Hourly fields
  hourlyStartTime: z.string().optional(),
  hourlyEndTime: z.string().optional(),
  hourlyDurationMinutes: z.number().min(1).optional(),
  // Signup anchor mode
  signupMode: z.enum(['rolling', 'fixed']),
  signupRollingHours: z.number().min(0).optional(),
  signupFixedDay: z.number().min(0).max(6).optional(),
  signupFixedTime: z.string().optional(),
}).refine((data) => {
  if (!data.startTime || !data.endTime) return true;
  return data.startTime < data.endTime;
}, {
  message: 'End time must be after start time',
  path: ['endTime'],
}).refine((data) => {
  if (['every_week', 'every_other_week', 'hourly'].includes(data.frequency)) {
    return data.days && data.days.length > 0;
  }
  return true;
}, {
  message: 'Select at least one day',
  path: ['days'],
}).refine((data) => {
  if (data.frequency === 'monthly_by_date') {
    return data.monthlyDate !== undefined;
  }
  return true;
}, {
  message: 'Select a date',
  path: ['monthlyDate'],
}).refine((data) => {
  if (data.frequency === 'monthly_by_day') {
    return data.monthlyOccurrence !== undefined && data.monthlyDayOfWeek !== undefined;
  }
  return true;
}, {
  message: 'Select occurrence and day',
  path: ['monthlyDayOfWeek'],
});

type FormData = z.infer<typeof formSchema>;

// ── Date generation helpers ──

function generateWeeklyDates(days: number[], startDate: Date, endDate: Date, everyOther: boolean): Date[] {
  const dates: Date[] = [];
  let current = startOfDay(startDate);
  let weekCount = 0;
  const firstDayOfRange = current;

  while (isBefore(current, endDate) || current.getTime() === endDate.getTime()) {
    const dayOfWeek = getDay(current);
    if (days.includes(dayOfWeek)) {
      // For every_other_week, calculate which week we're in relative to start
      if (everyOther) {
        const diffDays = Math.floor((current.getTime() - firstDayOfRange.getTime()) / (1000 * 60 * 60 * 24));
        const weekNum = Math.floor(diffDays / 7);
        if (weekNum % 2 === 0) {
          dates.push(new Date(current));
        }
      } else {
        dates.push(new Date(current));
      }
    }
    current = addDays(current, 1);
  }
  return dates;
}

function generateMonthlyByDateDates(dateNum: number, startDate: Date, endDate: Date): Date[] {
  const dates: Date[] = [];
  let current = startOfMonth(startDate);
  for (let i = 0; i < 3; i++) {
    const month = addMonths(current, i);
    const lastDay = getDate(lastDayOfMonth(month));
    const targetDate = dateNum > lastDay ? lastDay : dateNum;
    const d = setDate(month, targetDate);
    if ((isAfter(d, startDate) || d.getTime() === startDate.getTime()) && isBefore(d, endDate)) {
      dates.push(d);
    }
  }
  return dates;
}

function getNthDayOfMonth(year: number, month: number, dayOfWeek: number, occurrence: string): Date | null {
  const firstOfMonth = new Date(year, month, 1);
  let first = setDay(firstOfMonth, dayOfWeek, { weekStartsOn: 0 });
  if (isBefore(first, firstOfMonth)) first = addDays(first, 7);

  if (occurrence === 'last') {
    const last = lastDayOfMonth(firstOfMonth);
    let d = first;
    while (addDays(d, 7).getTime() <= last.getTime()) d = addDays(d, 7);
    return d;
  }
  const n = parseInt(occurrence) - 1;
  const result = addDays(first, n * 7);
  if (result.getMonth() !== month) return null;
  return result;
}

function generateMonthlyByDayDates(occurrence: string, dayOfWeek: number, startDate: Date, endDate: Date): Date[] {
  const dates: Date[] = [];
  const startMonth = startDate.getMonth();
  const startYear = startDate.getFullYear();
  for (let i = 0; i < 3; i++) {
    const m = (startMonth + i) % 12;
    const y = startYear + Math.floor((startMonth + i) / 12);
    const d = getNthDayOfMonth(y, m, dayOfWeek, occurrence);
    if (d && (isAfter(d, startDate) || d.getTime() === startDate.getTime()) && isBefore(d, endDate)) {
      dates.push(d);
    }
  }
  return dates;
}

export default function CreateRecurringMic() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { hasFeature } = useProducerFeatures();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

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
      producerMessage: '',
      venueName: producer?.venue_name || '',
      venueAddress: producer?.venue_address || '',
      startTime: '',
      endTime: '',
      sections: [{ label: '', slots: 10 }],
      allowMultipleSlots: false,
      isActive: true,
      frequency: 'every_week',
      days: [],
      monthlyDate: undefined,
      monthlyOccurrence: undefined,
      monthlyDayOfWeek: undefined,
      hourlyStartTime: '',
      hourlyEndTime: '',
      hourlyDurationMinutes: 60,
      signupMode: 'rolling',
      signupRollingHours: 48,
      signupFixedDay: undefined,
      signupFixedTime: '',
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

  const watchDays = watch('days') || [];
  const watchRecurrenceEndDate = watch('recurrenceEndDate');
  const watchFrequency = watch('frequency');
  const watchSignupMode = watch('signupMode');

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

      const recurrenceRule: Record<string, any> = {
        frequency: data.frequency,
        days: data.days || [],
      };
      if (data.frequency === 'monthly_by_date') {
        recurrenceRule.monthly_date = data.monthlyDate;
      }
      if (data.frequency === 'monthly_by_day') {
        recurrenceRule.monthly_occurrence = data.monthlyOccurrence;
        recurrenceRule.monthly_day_of_week = data.monthlyDayOfWeek;
      }
      if (data.frequency === 'hourly') {
        recurrenceRule.hourly_start_time = data.hourlyStartTime;
        recurrenceRule.hourly_end_time = data.hourlyEndTime;
        recurrenceRule.hourly_duration_minutes = data.hourlyDurationMinutes;
      }

      // Build template insert payload
      const insertPayload: Record<string, any> = {
        producer_id: user.id,
        title: data.title,
        producer_message: data.producerMessage || null,
        venue_name: data.venueName,
        venue_address: data.venueAddress,
        start_time: data.startTime,
        end_time: data.endTime,
        sections_config: sectionsConfig,
        allow_multiple_slots: data.allowMultipleSlots,
        signup_opens_hours_before: data.signupMode === 'rolling' ? (data.signupRollingHours ?? 48) : null,
        recurrence_end_date: data.recurrenceEndDate ? format(data.recurrenceEndDate, 'yyyy-MM-dd') : null,
        is_active: data.isActive,
        recurrence_rule: recurrenceRule,
        signup_anchor_day: data.signupMode === 'fixed' ? (data.signupFixedDay ?? null) : null,
        signup_anchor_time: data.signupMode === 'fixed' ? (data.signupFixedTime || null) : null,
      };

      const { data: templateData, error: templateError } = await (supabase.from('event_templates') as any)
        .insert(insertPayload)
        .select('id, series_id')
        .single();

      if (templateError) throw templateError;

      // ── Generate events for the next 30 days ──
      const today = startOfDay(new Date());
      const thirtyDaysOut = addDays(today, 30);
      let eventDates: Date[] = [];

      switch (data.frequency) {
        case 'every_week':
          eventDates = generateWeeklyDates(data.days || [], today, thirtyDaysOut, false);
          break;
        case 'every_other_week':
          eventDates = generateWeeklyDates(data.days || [], today, thirtyDaysOut, true);
          break;
        case 'monthly_by_date':
          eventDates = generateMonthlyByDateDates(data.monthlyDate!, today, thirtyDaysOut);
          break;
        case 'monthly_by_day':
          eventDates = generateMonthlyByDayDates(data.monthlyOccurrence!, data.monthlyDayOfWeek!, today, thirtyDaysOut);
          break;
        case 'hourly':
          // For hourly, generate one event per matching day (the hourly slots are within a single event)
          eventDates = generateWeeklyDates(data.days || [], today, thirtyDaysOut, false);
          break;
      }

      if (eventDates.length > 0) {
        const eventsToInsert = eventDates.map(d => {
          const eventDate = format(d, 'yyyy-MM-dd');

          // Calculate signup_opens_at based on mode
          let signupOpensAt: string | null = null;
          if (data.signupMode === 'rolling' && data.signupRollingHours) {
            const eventDateTime = new Date(`${eventDate}T${data.startTime}`);
            signupOpensAt = new Date(eventDateTime.getTime() - data.signupRollingHours * 60 * 60 * 1000).toISOString();
          }
          // For fixed mode, signup_opens_at would need more complex weekly logic — stored on template for now

          return {
            producer_id: user.id,
            title: data.title,
            description: data.description || null,
            venue_name: data.venueName,
            venue_address: data.venueAddress,
            start_time: data.startTime,
            end_time: data.endTime,
            date: eventDate,
            sections_config: sectionsConfig,
            allow_multiple_slots: data.allowMultipleSlots,
            status: 'published',
            is_info_only: false,
            template_id: templateData.id,
            series_id: templateData.series_id,
            signup_opens_at: signupOpensAt,
          };
        });

        const { error: eventsError } = await supabase.from('events').insert(eventsToInsert);
        if (eventsError) throw eventsError;
      }

      toast({
        title: 'Recurring mic created!',
        description: `Template saved and ${eventDates.length} show${eventDates.length !== 1 ? 's' : ''} created for the next 30 days.`,
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
          <p className="text-muted-foreground">Your template has been saved and shows have been created for the next 30 days.</p>
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

        {/* Recurrence Schedule */}
        <section className="space-y-4">
          <h2 className="text-lg font-medium text-foreground">Recurrence Schedule</h2>

          <div className="space-y-2">
            <Label>Frequency *</Label>
            <Select value={watchFrequency} onValueChange={(val) => setValue('frequency', val as any)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="every_week">Every week</SelectItem>
                <SelectItem value="every_other_week">Every other week</SelectItem>
                <SelectItem value="monthly_by_date">Monthly by date</SelectItem>
                <SelectItem value="monthly_by_day">Monthly by day</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Day picker for weekly / every other week */}
          {(watchFrequency === 'every_week' || watchFrequency === 'every_other_week') && (
            <div className="space-y-2">
              <Label>Days *</Label>
              <div className="flex flex-wrap gap-2">
                {DAY_NAMES.map((day, i) => {
                  const selected = watchDays.includes(i);
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => {
                        if (selected) {
                          setValue('days', watchDays.filter(d => d !== i));
                        } else {
                          setValue('days', [...watchDays, i].sort());
                        }
                      }}
                      className={cn(
                        'px-3 py-1.5 rounded-md text-sm font-medium border transition-colors',
                        selected
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-background text-foreground border-border hover:bg-accent'
                      )}
                    >
                      {DAY_SHORT[i]}
                    </button>
                  );
                })}
              </div>
              <p className="text-sm text-muted-foreground">Select all days this mic runs.</p>
              {errors.days && <p className="text-sm text-destructive">{errors.days.message}</p>}
            </div>
          )}

          {/* Monthly by date */}
          {watchFrequency === 'monthly_by_date' && (
            <div className="space-y-2">
              <Label>Day of the month *</Label>
              <Select
                value={watch('monthlyDate')?.toString() ?? ''}
                onValueChange={(val) => setValue('monthlyDate', parseInt(val))}
              >
                <SelectTrigger><SelectValue placeholder="Select date" /></SelectTrigger>
                <SelectContent>
                  {DATE_NUMBERS.map(n => (
                    <SelectItem key={n} value={n.toString()}>
                      {n === 1 ? '1st' : n === 2 ? '2nd' : n === 3 ? '3rd' : `${n}th`}
                    </SelectItem>
                  ))}
                  <SelectItem value="last">Last day</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">Example: "Every 1st of the month."</p>
              {errors.monthlyDate && <p className="text-sm text-destructive">{errors.monthlyDate.message}</p>}
            </div>
          )}

          {/* Monthly by day */}
          {watchFrequency === 'monthly_by_day' && (
            <div className="space-y-2">
              <Label>Occurrence and day *</Label>
              <div className="flex gap-3">
                <Select
                  value={watch('monthlyOccurrence') ?? ''}
                  onValueChange={(val) => setValue('monthlyOccurrence', val as any)}
                >
                  <SelectTrigger className="w-28"><SelectValue placeholder="Which" /></SelectTrigger>
                  <SelectContent>
                    {OCCURRENCE_LABELS.map((label, i) => (
                      <SelectItem key={label} value={i < 4 ? (i + 1).toString() : 'last'}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={watch('monthlyDayOfWeek')?.toString() ?? ''}
                  onValueChange={(val) => setValue('monthlyDayOfWeek', parseInt(val))}
                >
                  <SelectTrigger className="flex-1"><SelectValue placeholder="Day" /></SelectTrigger>
                  <SelectContent>
                    {DAY_NAMES.map((day, i) => (
                      <SelectItem key={i} value={i.toString()}>{day}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <p className="text-sm text-muted-foreground">Example: "Every 2nd Tuesday."</p>
              {errors.monthlyDayOfWeek && <p className="text-sm text-destructive">{errors.monthlyDayOfWeek.message}</p>}
            </div>
          )}

          {/* Advanced — Hourly */}
          <Collapsible open={showAdvanced || watchFrequency === 'hourly'} onOpenChange={setShowAdvanced}>
            <CollapsibleTrigger asChild>
              <Button type="button" variant="ghost" size="sm" className="gap-2 text-muted-foreground">
                <ChevronDown className={cn('h-4 w-4 transition-transform', (showAdvanced || watchFrequency === 'hourly') && 'rotate-180')} />
                Advanced
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-4 pt-2">
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => setValue('frequency', watchFrequency === 'hourly' ? 'every_week' : 'hourly')}
                  className={cn(
                    'px-3 py-1.5 rounded-md text-sm font-medium border transition-colors',
                    watchFrequency === 'hourly'
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-background text-foreground border-border hover:bg-accent'
                  )}
                >
                  Hourly
                </button>
              </div>

              {watchFrequency === 'hourly' && (
                <div className="space-y-4 pl-2 border-l-2 border-primary/20">
                  <div className="space-y-2">
                    <Label>Days *</Label>
                    <div className="flex flex-wrap gap-2">
                      {DAY_NAMES.map((day, i) => {
                        const selected = watchDays.includes(i);
                        return (
                          <button
                            key={i}
                            type="button"
                            onClick={() => {
                              if (selected) {
                                setValue('days', watchDays.filter(d => d !== i));
                              } else {
                                setValue('days', [...watchDays, i].sort());
                              }
                            }}
                            className={cn(
                              'px-3 py-1.5 rounded-md text-sm font-medium border transition-colors',
                              selected
                                ? 'bg-primary text-primary-foreground border-primary'
                                : 'bg-background text-foreground border-border hover:bg-accent'
                            )}
                          >
                            {DAY_SHORT[i]}
                          </button>
                        );
                      })}
                    </div>
                    <p className="text-sm text-muted-foreground">Select all days this mic runs.</p>
                    {errors.days && <p className="text-sm text-destructive">{errors.days.message}</p>}
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-2">
                      <Label>Window start</Label>
                      <Input type="time" {...register('hourlyStartTime')} />
                    </div>
                    <div className="space-y-2">
                      <Label>Window end</Label>
                      <Input type="time" {...register('hourlyEndTime')} />
                    </div>
                    <div className="space-y-2">
                      <Label>Every (min)</Label>
                      <Input type="number" min={1} {...register('hourlyDurationMinutes', { valueAsNumber: true })} />
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Example: "Every Monday through Friday from 6pm to 10pm, every 60 minutes."
                  </p>
                </div>
              )}
            </CollapsibleContent>
          </Collapsible>

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

          <div className="space-y-4">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="radio"
                name="signupMode"
                value="rolling"
                checked={watchSignupMode === 'rolling'}
                onChange={() => setValue('signupMode', 'rolling')}
                className="mt-1"
              />
              <div className="space-y-2 flex-1">
                <span className="text-sm font-medium text-foreground">Rolling</span>
                <p className="text-sm text-muted-foreground">Sign-ups open a set number of hours before each show.</p>
                {watchSignupMode === 'rolling' && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Sign-ups open</span>
                    <Input type="number" min={0} className="w-20" {...register('signupRollingHours', { valueAsNumber: true })} />
                    <span className="text-sm text-muted-foreground">hours before each show.</span>
                  </div>
                )}
              </div>
            </label>

            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="radio"
                name="signupMode"
                value="fixed"
                checked={watchSignupMode === 'fixed'}
                onChange={() => setValue('signupMode', 'fixed')}
                className="mt-1"
              />
              <div className="space-y-2 flex-1">
                <span className="text-sm font-medium text-foreground">Fixed</span>
                <p className="text-sm text-muted-foreground">Sign-ups open on a specific day and time each week.</p>
                {watchSignupMode === 'fixed' && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">Sign-ups open every</span>
                      <Select
                        value={watch('signupFixedDay')?.toString() ?? ''}
                        onValueChange={(val) => setValue('signupFixedDay', parseInt(val))}
                      >
                        <SelectTrigger className="w-32"><SelectValue placeholder="Day" /></SelectTrigger>
                        <SelectContent>
                          {DAY_NAMES.map((day, i) => (
                            <SelectItem key={i} value={i.toString()}>{day}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <span className="text-sm text-muted-foreground">at</span>
                      <Input type="time" className="w-32" {...register('signupFixedTime')} />
                    </div>
                    <p className="text-xs text-muted-foreground">Sign-ups will open for that week's show only, not all future shows.</p>
                  </div>
                )}
              </div>
            </label>
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
        <div className="space-y-3 pt-4">
          <div className="flex gap-3">
            <Button type="button" variant="ghost" onClick={handleCancel} disabled={isSubmitting}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create Recurring Mic'}
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            We'll create your shows for the next 30 days. Come back in a month to add more.
          </p>
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
