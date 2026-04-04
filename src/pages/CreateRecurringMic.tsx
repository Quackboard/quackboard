import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format, addDays, startOfDay, getDay } from 'date-fns';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { MarkdownEditor } from '@/components/ui/MarkdownEditor';
import { useToast } from '@/hooks/use-toast';
import { useFormDraft } from '@/hooks/useFormDraft';

const CREATE_RECURRING_MIC_DRAFT_KEY = 'quackboard_create_recurring_mic_draft';
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
import {
  generateEventDates,
  calculateSignupOpensAt,
  type RecurrenceRule,
} from '@/lib/recurring-event-generator';

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
  description: z.string().optional(),
  producerMessage: z.string().optional(),
  venueName: z.string().min(1, 'Venue name is required'),
  venueAddress: z.string().min(1, 'Venue address is required'),
  startTime: z.string().min(1, 'Start time is required'),
  endTime: z.string().min(1, 'End time is required'),
  firstShowDate: z.date({ required_error: 'First show date is required' }),
  sections: z.array(sectionSchema).min(1, 'At least one section required'),
  allowMultipleSlots: z.boolean(),
  recurrenceEndDate: z.date().optional(),
  isActive: z.boolean(),
  publishAt: z.string().optional(),
  // Frequency
  frequency: z.enum(['every_week', 'every_other_week', 'monthly_by_date', 'monthly_by_day']),
  // Weekly/biweekly day picks
  days: z.array(z.number()).optional(),
  // Monthly by date
  monthlyDate: z.number().min(1).max(31).optional(),
  // Monthly by day
  monthlyOccurrence: z.enum(['1', '2', '3', '4', 'last']).optional(),
  monthlyDayOfWeek: z.number().min(0).max(6).optional(),
  // Multi-show per day
  multiShowEnabled: z.boolean(),
  multiShowDuration: z.number().optional(),
  multiShowLastStart: z.string().optional(),
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
  if (['every_week', 'every_other_week'].includes(data.frequency)) {
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

// ── Helpers ──

function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + (m || 0);
}

function getFirstMatchingDate(
  startDate: Date,
  frequency: string,
  days?: number[],
  monthlyDate?: number,
  monthlyOccurrence?: string,
  monthlyDayOfWeek?: number,
): Date | null {
  if (frequency === 'every_week' || frequency === 'every_other_week') {
    if (!days || days.length === 0) return null;
    for (let i = 0; i < 7; i++) {
      const candidate = addDays(startDate, i);
      if (days.includes(getDay(candidate))) return candidate;
    }
    return null;
  }
  if (frequency === 'monthly_by_date' && monthlyDate !== undefined) {
    // Next occurrence of that date
    const d = new Date(startDate);
    for (let i = 0; i < 62; i++) {
      const candidate = addDays(d, i);
      const dayNum = candidate.getDate();
      if (monthlyDate === -1) {
        // Last day of month — check if next day is 1st
        const next = addDays(candidate, 1);
        if (next.getDate() === 1) return candidate;
      } else if (dayNum === monthlyDate) {
        return candidate;
      }
    }
    return null;
  }
  if (frequency === 'monthly_by_day' && monthlyOccurrence && monthlyDayOfWeek !== undefined) {
    // Scan next 62 days
    for (let i = 0; i < 62; i++) {
      const candidate = addDays(startDate, i);
      if (getDay(candidate) !== monthlyDayOfWeek) continue;
      // Check which occurrence this is
      const firstOfMonth = new Date(candidate.getFullYear(), candidate.getMonth(), 1);
      const weekNum = Math.floor((candidate.getDate() - 1) / 7) + 1;
      if (monthlyOccurrence === 'last') {
        const nextWeek = addDays(candidate, 7);
        if (nextWeek.getMonth() !== candidate.getMonth()) return candidate;
      } else if (weekNum === parseInt(monthlyOccurrence)) {
        return candidate;
      }
    }
    return null;
  }
  return null;
}

export default function CreateRecurringMic() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { hasFeature } = useProducerFeatures();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [generatedCount, setGeneratedCount] = useState(0);

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
      producerMessage: '',
      venueName: '',
      venueAddress: '',
      startTime: '',
      endTime: '',
      firstShowDate: undefined,
      sections: [{ label: '', slots: 10 }],
      allowMultipleSlots: false,
      isActive: true,
      frequency: 'every_week',
      days: [],
      monthlyDate: undefined,
      monthlyOccurrence: undefined,
      monthlyDayOfWeek: undefined,
      multiShowEnabled: false,
      multiShowDuration: 60,
      multiShowLastStart: '',
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

  const { clearDraft } = useFormDraft({
    form,
    storageKey: CREATE_RECURRING_MIC_DRAFT_KEY,
    debounceMs: 2000,
  });

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
  const watchFirstShowDate = watch('firstShowDate');
  const watchStartTime = watch('startTime');
  const watchEndTime = watch('endTime');
  const watchMultiShowEnabled = watch('multiShowEnabled');
  const watchMultiShowDuration = watch('multiShowDuration');
  const watchMultiShowLastStart = watch('multiShowLastStart');
  const watchMonthlyDate = watch('monthlyDate');
  const watchMonthlyOccurrence = watch('monthlyOccurrence');
  const watchMonthlyDayOfWeek = watch('monthlyDayOfWeek');

  // ── First show auto-adjust ──
  const firstMatchDate = useMemo(() => {
    if (!watchFirstShowDate) return null;
    return getFirstMatchingDate(
      watchFirstShowDate,
      watchFrequency,
      watchDays,
      watchMonthlyDate,
      watchMonthlyOccurrence,
      watchMonthlyDayOfWeek,
    );
  }, [watchFirstShowDate, watchFrequency, watchDays, watchMonthlyDate, watchMonthlyOccurrence, watchMonthlyDayOfWeek]);

  // ── Build recurrence rule ──
  function buildRecurrenceRule(data: FormData): RecurrenceRule {
    const startTime = data.startTime;
    const endTime = data.endTime;
    const durationMin = timeToMinutes(endTime) - timeToMinutes(startTime);

    if (data.frequency === 'every_week' || data.frequency === 'every_other_week') {
      if (data.multiShowEnabled && data.multiShowDuration && data.multiShowLastStart) {
        return {
          frequency: 'hourly',
          interval: data.frequency === 'every_other_week' ? 2 : 1,
          days: data.days || [],
          time_start: startTime,
          time_end: data.multiShowLastStart,
          duration_minutes: data.multiShowDuration,
        };
      }
      return {
        frequency: 'weekly',
        interval: data.frequency === 'every_other_week' ? 2 : 1,
        days: data.days || [],
        time_start: startTime,
        duration_minutes: durationMin,
      };
    }

    if (data.frequency === 'monthly_by_date') {
      return {
        frequency: 'monthly',
        interval: 1,
        month_day: data.monthlyDate!,
        time_start: startTime,
        duration_minutes: durationMin,
      };
    }

    // monthly_by_day
    const weekNum = data.monthlyOccurrence === 'last' ? -1 : parseInt(data.monthlyOccurrence!);
    return {
      frequency: 'monthly',
      interval: 1,
      month_week: weekNum,
      month_weekday: data.monthlyDayOfWeek!,
      time_start: startTime,
      duration_minutes: durationMin,
    };
  }

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

      const recurrenceRule = buildRecurrenceRule(data);

      // Step 1 — Insert event_templates
      const insertPayload: Record<string, any> = {
        producer_id: user.id,
        title: data.title,
        description: data.description || null,
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
        .select('id')
        .single();

      if (templateError) throw templateError;

      // Step 2 — Generate events (only after template insert succeeds)
      const firstDate = firstMatchDate || data.firstShowDate;
      const generatedEvents = generateEventDates(firstDate, recurrenceRule);

      if (generatedEvents.length > 0) {
        const timezone = producer?.timezone || 'America/Los_Angeles';

        const eventsToInsert = generatedEvents.map(ev => {
          const signupOpensAt = calculateSignupOpensAt({
            eventDate: ev.date,
            eventStartTime: ev.start_time,
            timezone,
            mode: data.signupMode,
            rollingHours: data.signupRollingHours,
            anchorDay: data.signupFixedDay,
            anchorTime: data.signupFixedTime,
          });

          return {
            producer_id: user.id,
            template_id: templateData.id,
            title: data.title,
            description: data.description || null,
            producer_message: data.producerMessage || null,
            venue_name: data.venueName,
            venue_address: data.venueAddress,
            date: ev.date,
            start_time: ev.start_time,
            end_time: ev.end_time,
            sections_config: sectionsConfig,
            allow_multiple_slots: data.allowMultipleSlots,
            signup_opens_at: signupOpensAt,
            status: 'published',
            is_info_only: false,
          };
        });

        const { error: eventsError } = await supabase.from('events').insert(eventsToInsert);
        if (eventsError) throw eventsError;
        setGeneratedCount(eventsToInsert.length);
      } else {
        setGeneratedCount(0);
      }

      toast({
        title: 'Recurring mic created!',
        description: `Template saved and ${generatedEvents.length} show${generatedEvents.length !== 1 ? 's' : ''} created for the next 30 days.`,
      });

      clearDraft();
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
          <p className="text-muted-foreground">
            Your template has been saved and {generatedCount} show{generatedCount !== 1 ? 's' : ''} created for the next 30 days.
          </p>
          <div className="flex flex-col gap-3">
            <Button onClick={() => navigate('/dashboard')}>Go to Dashboard</Button>
            <Button variant="outline" onClick={() => { clearDraft(); navigate('/create'); }}>Create Another</Button>
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
        {/* 1. Mic Name */}
        <section className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Mic Name *</Label>
            <Input id="title" placeholder="e.g., Tuesday Night Open Mic" {...register('title')} />
            {errors.title && <p className="text-sm text-destructive">{errors.title.message}</p>}
          </div>


          {/* 3. Venue */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="venueName">Venue Name *</Label>
              <Input id="venueName" placeholder="e.g., The Comedy Store" {...register('venueName')} />
              {errors.venueName && <p className="text-sm text-destructive">{errors.venueName.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="venueAddress">Venue Address *</Label>
              <Input id="venueAddress" placeholder="e.g., 123 Main St, LA, CA" {...register('venueAddress')} />
              {errors.venueAddress && <p className="text-sm text-destructive">{errors.venueAddress.message}</p>}
            </div>
          </div>

          {/* 4. Start / End Time */}
          <div className="space-y-2">
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
            <p className="text-sm text-muted-foreground">
              First event in the series only. For example, if you host mics every hour from 10am–2pm, enter 10am–11am here.
            </p>
          </div>
        </section>

        {/* 5. First Show Date */}
        <section className="space-y-4">
          <div className="space-y-2">
            <Label>When does this mic start? *</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn('w-full justify-start text-left font-normal', !watchFirstShowDate && 'text-muted-foreground')}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {watchFirstShowDate ? format(watchFirstShowDate, 'PPP') : 'Pick a date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={watchFirstShowDate}
                  onSelect={(date) => setValue('firstShowDate', date as Date)}
                  disabled={(date) => date < startOfDay(new Date())}
                  initialFocus
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
            {errors.firstShowDate && <p className="text-sm text-destructive">{errors.firstShowDate.message}</p>}
            {firstMatchDate && (
              <p className="text-sm text-primary font-medium">
                First show: {format(firstMatchDate, 'EEEE, MMMM d')}
              </p>
            )}
          </div>
        </section>

        {/* 6. Frequency */}
        <section className="space-y-4">
          <h2 className="text-lg font-medium text-foreground">Schedule</h2>

          <div className="space-y-3">
            <Label>Frequency *</Label>
            <div className="space-y-2">
              {([
                { value: 'every_week', label: 'Every week' },
                { value: 'every_other_week', label: 'Every other week' },
                { value: 'monthly_by_date', label: 'Monthly by date' },
                { value: 'monthly_by_day', label: 'Monthly by day' },
              ] as const).map(opt => (
                <label key={opt.value} className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="radio"
                    name="frequency"
                    value={opt.value}
                    checked={watchFrequency === opt.value}
                    onChange={() => setValue('frequency', opt.value)}
                    className="accent-primary"
                  />
                  <span className="text-sm font-medium text-foreground">{opt.label}</span>
                </label>
              ))}
            </div>
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
                value={watchMonthlyDate?.toString() ?? ''}
                onValueChange={(val) => setValue('monthlyDate', val === 'last' ? -1 : parseInt(val))}
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
            </div>
          )}

          {/* Monthly by day */}
          {watchFrequency === 'monthly_by_day' && (
            <div className="space-y-2">
              <Label>Occurrence and day *</Label>
              <div className="flex gap-3">
                <Select
                  value={watchMonthlyOccurrence ?? ''}
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
                  value={watchMonthlyDayOfWeek?.toString() ?? ''}
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
              {errors.monthlyDayOfWeek && <p className="text-sm text-destructive">{errors.monthlyDayOfWeek.message}</p>}
            </div>
          )}
        </section>

        {/* 7. Multiple shows per day */}
        {(watchFrequency === 'every_week' || watchFrequency === 'every_other_week') && (
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="multiShow">This mic runs multiple times per day</Label>
              </div>
              <Switch
                id="multiShow"
                checked={watchMultiShowEnabled}
                onCheckedChange={(checked) => setValue('multiShowEnabled', checked)}
              />
            </div>

            {watchMultiShowEnabled && (
              <div className="space-y-4 pl-4 border-l-2 border-primary/20">
                <div className="space-y-2">
                  <Label>Each show runs for *</Label>
                  <Select
                    value={watchMultiShowDuration?.toString() ?? '60'}
                    onValueChange={(val) => setValue('multiShowDuration', parseInt(val))}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="30">30 minutes</SelectItem>
                      <SelectItem value="60">60 minutes</SelectItem>
                      <SelectItem value="90">90 minutes</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Last show starts by *</Label>
                  <Input type="time" {...register('multiShowLastStart')} />
                  {watchStartTime && watchMultiShowDuration && watchMultiShowLastStart && (
                    <p className="text-sm text-muted-foreground">
                      Shows at: {(() => {
                        const slots: string[] = [];
                        let cur = timeToMinutes(watchStartTime);
                        const end = timeToMinutes(watchMultiShowLastStart);
                        while (cur <= end) {
                          const h = Math.floor(cur / 60);
                          const m = cur % 60;
                          const ampm = h >= 12 ? 'PM' : 'AM';
                          const h12 = h % 12 || 12;
                          slots.push(`${h12}:${m.toString().padStart(2, '0')} ${ampm}`);
                          cur += watchMultiShowDuration;
                        }
                        return slots.join(', ');
                      })()}
                    </p>
                  )}
                </div>
              </div>
            )}
          </section>
        )}

        {/* 8. Signup Anchor */}
        <section className="space-y-4">
          <h2 className="text-lg font-medium text-foreground">When do sign-ups open?</h2>

          <div className="space-y-4">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="radio"
                name="signupMode"
                value="rolling"
                checked={watchSignupMode === 'rolling'}
                onChange={() => setValue('signupMode', 'rolling')}
                className="mt-1 accent-primary"
              />
              <div className="space-y-2 flex-1">
                <span className="text-sm font-medium text-foreground">Hours before each show</span>
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
                className="mt-1 accent-primary"
              />
              <div className="space-y-2 flex-1">
                <span className="text-sm font-medium text-foreground">Fixed day and time each week</span>
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
                    <p className="text-xs text-muted-foreground">Sign-ups will open for that week's show only, not all future shows at once.</p>
                  </div>
                )}
              </div>
            </label>
          </div>
        </section>

        {/* 9. Sections Builder */}
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

        {/* 10. Additional Settings */}
        <section className="space-y-4">
          <h2 className="text-lg font-medium text-foreground">Additional Settings</h2>

          {/* Additional Info / Producer Message */}
          <div className="space-y-2">
            <Label>Additional Info (optional)</Label>
            <p className="text-sm text-muted-foreground">This message will be sent to comic after they sign up.</p>
            <Controller
              name="producerMessage"
              control={control}
              render={({ field }) => (
                <MarkdownEditor value={field.value || ''} onChange={field.onChange} placeholder="Details shown to comics after they sign up..." />
              )}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="isActive">Active</Label>
              <p className="text-sm text-muted-foreground">When active, events will be generated from this template</p>
            </div>
            <Switch id="isActive" checked={watch('isActive')} onCheckedChange={(checked) => setValue('isActive', checked)} />
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

        {/* 11. Submit */}
        <div className="space-y-3 pt-4">
          <p className="text-sm text-muted-foreground">
            We'll create your shows for the next 30 days starting from your first show date. Come back in a month to add more.
          </p>
          <div className="flex gap-3">
            <Button type="button" variant="ghost" onClick={handleCancel} disabled={isSubmitting}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create Recurring Mic'}
            </Button>
          </div>
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
            <AlertDialogAction onClick={() => { clearDraft(); navigate('/create'); }}>Discard</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ProducerLayout>
  );
}
