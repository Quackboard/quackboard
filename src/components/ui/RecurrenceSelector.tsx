import React from 'react';
import { format, addHours, addDays, addWeeks, getDay } from 'date-fns';
import { CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Switch } from '@/components/ui/switch';

export type RecurrenceType = 'hourly' | 'daily' | 'weekly' | 'weekdays' | 'weekends';

export interface RecurrenceConfig {
  label: string;
  type: RecurrenceType;
}

const RECURRENCE_OPTIONS: { value: string; label: string }[] = [
  { value: 'none', label: 'Does not repeat' },
  { value: 'hourly', label: 'Hourly' },
  { value: 'daily', label: 'Daily (every day)' },
  { value: 'weekdays', label: 'Weekdays only (Mon–Fri)' },
  { value: 'weekends', label: 'Weekends only (Sat–Sun)' },
  { value: 'weekly', label: 'Weekly' },
];
// Limit to prevent unintended large batch creation
const MAX_RECURRING_EVENTS = 100;

export function generateRecurringDates({
  startDate,
  endDate,
  startTime,
  dailyEndTime,
  recurrence
}: {
  startDate: Date;
  endDate: Date;
  startTime: string;
  dailyEndTime?: string;
  recurrence: RecurrenceConfig;
}): Date[] {
  const events: Date[] = [];
  const [startHours, startMinutes] = startTime.split(':').map(Number);

  const startDateTime = new Date(startDate);
  startDateTime.setHours(startHours, startMinutes, 0, 0);

  let currentDateTime = new Date(startDateTime);
  const endDateTime = new Date(endDate);
  endDateTime.setHours(23, 59, 59, 999);

  while (currentDateTime <= endDateTime && events.length < MAX_RECURRING_EVENTS) {
    const dayOfWeek = getDay(currentDateTime); // 0=Sun, 6=Sat

    if (recurrence.type === 'weekdays') {
      if (dayOfWeek >= 1 && dayOfWeek <= 5) {
        events.push(new Date(currentDateTime));
      }
      currentDateTime = addDays(currentDateTime, 1);
      currentDateTime.setHours(startHours, startMinutes, 0, 0);
    } else if (recurrence.type === 'weekends') {
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        events.push(new Date(currentDateTime));
      }
      currentDateTime = addDays(currentDateTime, 1);
      currentDateTime.setHours(startHours, startMinutes, 0, 0);
    } else if (recurrence.type === 'hourly' && dailyEndTime) {
      // HOURLY REFINE: Repeat every hour ONLY within the Start/End time window for each day
      const [endH, endM] = dailyEndTime.split(':').map(Number);
      let dayTime = new Date(currentDateTime);
      const dayEnd = new Date(currentDateTime);
      dayEnd.setHours(endH, endM, 0, 0);

      while (dayTime <= dayEnd && events.length < MAX_RECURRING_EVENTS) {
        events.push(new Date(dayTime));
        dayTime = addHours(dayTime, 1);
      }
      currentDateTime = addDays(currentDateTime, 1);
      currentDateTime.setHours(startHours, startMinutes, 0, 0);
    } else if (recurrence.type === 'daily') {
      events.push(new Date(currentDateTime));
      currentDateTime = addDays(currentDateTime, 1);
      currentDateTime.setHours(startHours, startMinutes, 0, 0);
    } else if (recurrence.type === 'weekly') {
      events.push(new Date(currentDateTime));
      currentDateTime = addWeeks(currentDateTime, 1);
      currentDateTime.setHours(startHours, startMinutes, 0, 0);
    } else if (recurrence.type === 'hourly' && !dailyEndTime) {
      // Fallback for legacy calls without dailyEndTime
      events.push(new Date(currentDateTime));
      currentDateTime = addHours(currentDateTime, 1);
    }
  }

  return events;
}

interface RecurrenceSelectorProps {
  value: RecurrenceConfig | null;
  onChange: (value: RecurrenceConfig | null) => void;
  endDate: Date | undefined;
  onEndDateChange: (date: Date | undefined) => void;
  startDate: Date | undefined;
  startTime: string | undefined;
  endTime: string | undefined;
}

export function RecurrenceSelector({
  value,
  onChange,
  endDate,
  onEndDateChange,
  startDate,
  startTime,
  endTime
}: RecurrenceSelectorProps) {
  const isEnabled = value !== null;
  const [showAll, setShowAll] = React.useState(false);

  // Recalculate preview dates whenever inputs change
  const recurringDates = React.useMemo(() => {
    if (!isEnabled || !startDate || !endDate || !startTime || !value) return [];
    return generateRecurringDates({
      startDate,
      endDate,
      startTime,
      dailyEndTime: endTime,
      recurrence: value,
    });
  }, [isEnabled, startDate, endDate, startTime, endTime, value]);

  const previewDates = showAll ? recurringDates : recurringDates.slice(0, 4);

  // Calculates the 'End Time' for a mic based on the original mic's duration
  const getEventEndTime = (start: Date) => {
    if (!startTime || !endTime) return start;
    const [sH, sM] = startTime.split(':').map(Number);
    const [eH, eM] = endTime.split(':').map(Number);
    const durationMin = (eH * 60 + eM) - (sH * 60 + sM);
    const end = new Date(start);
    end.setMinutes(end.getMinutes() + durationMin);
    return end;
  };

  return (
    <div className="space-y-4 pt-4 border-t border-border">
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label>Recurring Event</Label>
          <p className="text-sm text-muted-foreground">
            Create multiple mics on a repeating schedule
          </p>
        </div>
        <Switch
          checked={isEnabled}
          onCheckedChange={(checked) => {
            if (checked) {
              onChange({ type: 'weekly', label: 'Weekly' });
            } else {
              onChange(null);
              onEndDateChange(undefined);
            }
          }}
        />
      </div>

      {isEnabled && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Frequency</Label>
              <Select
                value={value?.type || 'weekly'}
                onValueChange={(val) => {
                  const type = val as RecurrenceType;
                  const option = RECURRENCE_OPTIONS.find(o => o.value === type);
                  onChange({
                    type,
                    label: option?.label || type,
                  });
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select frequency" />
                </SelectTrigger>
                <SelectContent>
                  {RECURRENCE_OPTIONS.filter(opt => opt.value !== 'none').map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Until (End Date) *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !endDate && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {endDate ? format(endDate, 'PPP') : 'Pick end date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={onEndDateChange}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {recurringDates.length > 0 ? (
            <div className="space-y-2 rounded-lg border bg-muted/30 p-3 animate-in fade-in slide-in-from-top-1">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">
                  {recurringDates.length} mics will be created
                </span>
                {recurringDates.length > 4 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs"
                    onClick={() => setShowAll(!showAll)}
                  >
                    {showAll ? 'Show less' : `View all ${recurringDates.length}`}
                  </Button>
                )}
              </div>
              <ul className="space-y-1">
                {previewDates.map((date, i) => {
                  const evEnd = getEventEndTime(date);
                  return (
                    <li key={i} className="text-xs text-muted-foreground flex items-center justify-between">
                      <span>{format(date, 'EEEE, MMM d, yyyy')}</span>
                      <span>{format(date, 'h:mm a')} – {format(evEnd, 'h:mm a')}</span>
                    </li>
                  );
                })}
              </ul>
              {!showAll && recurringDates.length > 4 && (
                <p className="text-[10px] text-center text-muted-foreground pt-1 border-t border-border/50">
                  ... and {recurringDates.length - 4} more
                </p>
              )}
            </div>
          ) : (
            isEnabled && (
              <div className="text-xs text-muted-foreground italic bg-muted/10 p-3 rounded-md border border-dashed border-border/50">
                <p className="font-medium not-italic mb-1 opacity-70">Schedule Preview</p>
                {!startDate && <p>• Pick a starting date above</p>}
                {startDate && !startTime && <p>• Set a start time above</p>}
                {startDate && startTime && !endDate && <p>• Choose an end date (Until)</p>}
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
}
