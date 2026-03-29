import {
  addDays,
  startOfDay,
  getDay,
  getDate,
  setDay,
  isBefore,
  isAfter,
  addMonths,
  lastDayOfMonth,
  format,
} from 'date-fns';

/**
 * Recurrence rule as stored in event_templates.recurrence_rule (JSONB).
 */
export interface RecurrenceRule {
  frequency: 'weekly' | 'hourly' | 'monthly';
  interval: number; // 1 = every, 2 = every other
  days?: number[]; // 0-6 (Sun-Sat), used by weekly/hourly
  time_start: string; // HH:mm
  time_end?: string; // HH:mm, only for hourly
  duration_minutes: number;
  month_day?: number; // 1-31 or -1 for last
  month_week?: number; // 1-4 or -1 for last
  month_weekday?: number; // 0-6
}

export interface GeneratedEvent {
  date: string; // yyyy-MM-dd
  start_time: string; // HH:mm
  end_time: string; // HH:mm
}

/**
 * Given a first show date and a recurrence rule, generate all event
 * instances for the next 30 calendar days from firstShowDate.
 *
 * If firstShowDate doesn't match the recurrence rule, silently advance
 * to the next matching day and generate from there.
 */
export function generateEventDates(
  firstShowDate: Date,
  rule: RecurrenceRule
): GeneratedEvent[] {
  const windowEnd = addDays(startOfDay(firstShowDate), 30);
  const events: GeneratedEvent[] = [];

  if (rule.frequency === 'weekly' || rule.frequency === 'hourly') {
    return generateWeeklyOrHourly(firstShowDate, windowEnd, rule);
  }

  if (rule.frequency === 'monthly') {
    return generateMonthly(firstShowDate, windowEnd, rule);
  }

  return events;
}

// ── Weekly / Hourly ──

function generateWeeklyOrHourly(
  firstShowDate: Date,
  windowEnd: Date,
  rule: RecurrenceRule
): GeneratedEvent[] {
  const events: GeneratedEvent[] = [];
  const days = rule.days || [];
  if (days.length === 0) return events;

  // Find the first matching day on or after firstShowDate
  let cursor = startOfDay(firstShowDate);
  let firstMatchFound = false;
  let firstMatchDate: Date | null = null;

  // Scan up to 7 days to find first match
  for (let i = 0; i < 7; i++) {
    if (days.includes(getDay(addDays(cursor, i)))) {
      firstMatchDate = addDays(cursor, i);
      break;
    }
  }
  if (!firstMatchDate) return events;

  // Recalculate window from the actual first match
  const adjustedEnd = addDays(firstMatchDate, 30);
  cursor = firstMatchDate;

  // Track week number relative to first match for interval=2
  const originWeekStart = getWeekStart(firstMatchDate);

  while (isBefore(cursor, adjustedEnd) || cursor.getTime() === adjustedEnd.getTime()) {
    const dow = getDay(cursor);
    if (days.includes(dow)) {
      // Check interval (every other week)
      if (rule.interval === 2) {
        const thisWeekStart = getWeekStart(cursor);
        const weeksDiff = Math.round(
          (thisWeekStart.getTime() - originWeekStart.getTime()) / (7 * 24 * 60 * 60 * 1000)
        );
        if (weeksDiff % 2 !== 0) {
          cursor = addDays(cursor, 1);
          continue;
        }
      }

      if (rule.frequency === 'hourly' && rule.time_end) {
        // Generate multiple shows per day
        const slots = generateHourlySlots(rule.time_start, rule.time_end, rule.duration_minutes);
        for (const slot of slots) {
          events.push({
            date: format(cursor, 'yyyy-MM-dd'),
            start_time: slot.start,
            end_time: slot.end,
          });
        }
      } else {
        // Single show per day
        events.push({
          date: format(cursor, 'yyyy-MM-dd'),
          start_time: rule.time_start,
          end_time: addMinutesToTime(rule.time_start, rule.duration_minutes),
        });
      }
    }
    cursor = addDays(cursor, 1);
  }

  return events;
}

function getWeekStart(d: Date): Date {
  const day = getDay(d);
  // Week starts on Sunday (0)
  return startOfDay(addDays(d, -day));
}

function generateHourlySlots(
  timeStart: string,
  timeEnd: string,
  durationMinutes: number
): { start: string; end: string }[] {
  const slots: { start: string; end: string }[] = [];
  let currentMinutes = timeToMinutes(timeStart);
  const endMinutes = timeToMinutes(timeEnd);

  while (currentMinutes <= endMinutes) {
    const start = minutesToTime(currentMinutes);
    const end = minutesToTime(currentMinutes + durationMinutes);
    slots.push({ start, end });
    currentMinutes += durationMinutes;
  }

  return slots;
}

// ── Monthly ──

function generateMonthly(
  firstShowDate: Date,
  windowEnd: Date,
  rule: RecurrenceRule
): GeneratedEvent[] {
  const events: GeneratedEvent[] = [];

  if (rule.month_day !== undefined) {
    // Monthly by date
    return generateMonthlyByDate(firstShowDate, windowEnd, rule);
  }
  if (rule.month_week !== undefined && rule.month_weekday !== undefined) {
    return generateMonthlyByDay(firstShowDate, windowEnd, rule);
  }

  return events;
}

function generateMonthlyByDate(
  firstShowDate: Date,
  windowEnd: Date,
  rule: RecurrenceRule
): GeneratedEvent[] {
  const events: GeneratedEvent[] = [];
  const targetDay = rule.month_day!;

  // Check up to 3 months
  for (let i = 0; i < 3; i++) {
    const month = addMonths(firstShowDate, i);
    const lastDay = getDate(lastDayOfMonth(month));

    let d: Date;
    if (targetDay === -1) {
      // Last day of month
      d = lastDayOfMonth(month);
    } else {
      const actualDay = targetDay > lastDay ? lastDay : targetDay;
      d = new Date(month.getFullYear(), month.getMonth(), actualDay);
    }

    if (
      (isAfter(d, firstShowDate) || d.getTime() === startOfDay(firstShowDate).getTime()) &&
      isBefore(d, windowEnd)
    ) {
      events.push({
        date: format(d, 'yyyy-MM-dd'),
        start_time: rule.time_start,
        end_time: addMinutesToTime(rule.time_start, rule.duration_minutes),
      });
    }
  }
  return events;
}

function generateMonthlyByDay(
  firstShowDate: Date,
  windowEnd: Date,
  rule: RecurrenceRule
): GeneratedEvent[] {
  const events: GeneratedEvent[] = [];
  const startMonth = firstShowDate.getMonth();
  const startYear = firstShowDate.getFullYear();

  for (let i = 0; i < 3; i++) {
    const m = (startMonth + i) % 12;
    const y = startYear + Math.floor((startMonth + i) / 12);
    const d = getNthDayOfMonth(y, m, rule.month_weekday!, rule.month_week!);

    if (
      d &&
      (isAfter(d, firstShowDate) || d.getTime() === startOfDay(firstShowDate).getTime()) &&
      isBefore(d, windowEnd)
    ) {
      events.push({
        date: format(d, 'yyyy-MM-dd'),
        start_time: rule.time_start,
        end_time: addMinutesToTime(rule.time_start, rule.duration_minutes),
      });
    }
  }
  return events;
}

function getNthDayOfMonth(year: number, month: number, dayOfWeek: number, week: number): Date | null {
  const firstOfMonth = new Date(year, month, 1);
  let first = setDay(firstOfMonth, dayOfWeek, { weekStartsOn: 0 });
  if (isBefore(first, firstOfMonth)) first = addDays(first, 7);

  if (week === -1) {
    // Last occurrence
    const last = lastDayOfMonth(firstOfMonth);
    let d = first;
    while (addDays(d, 7).getTime() <= last.getTime()) d = addDays(d, 7);
    return d;
  }

  const result = addDays(first, (week - 1) * 7);
  if (result.getMonth() !== month) return null;
  return result;
}

// ── Signup opens_at calculation ──

/**
 * Calculate signup_opens_at for a single event instance.
 *
 * Mode 1 (rolling): event datetime - X hours
 * Mode 2 (fixed anchor): most recent anchor day/time before the event date
 */
export function calculateSignupOpensAt(opts: {
  eventDate: string; // yyyy-MM-dd
  eventStartTime: string; // HH:mm
  timezone: string;
  mode: 'rolling' | 'fixed';
  rollingHours?: number;
  anchorDay?: number; // 0-6
  anchorTime?: string; // HH:mm
}): string | null {
  if (opts.mode === 'rolling' && opts.rollingHours != null) {
    // Construct a date in the producer's local perspective, then shift back
    // Since times are stored as naive (no TZ), we build an ISO string using the TZ offset
    const eventMs = new Date(`${opts.eventDate}T${opts.eventStartTime}:00`).getTime();
    const opensMs = eventMs - opts.rollingHours * 60 * 60 * 1000;
    return new Date(opensMs).toISOString();
  }

  if (opts.mode === 'fixed' && opts.anchorDay != null && opts.anchorTime) {
    // Find the most recent anchorDay at anchorTime that falls before the event date
    const eventDateObj = new Date(`${opts.eventDate}T00:00:00`);
    const eventDow = getDay(eventDateObj);

    // Days back to the anchor day
    let daysBack = eventDow - opts.anchorDay;
    if (daysBack <= 0) daysBack += 7; // must be strictly before
    const anchorDate = addDays(eventDateObj, -daysBack);
    return new Date(`${format(anchorDate, 'yyyy-MM-dd')}T${opts.anchorTime}:00`).toISOString();
  }

  return null;
}

// ── Time helpers (pure string math, no Date objects) ──

function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + (m || 0);
}

function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60) % 24;
  const m = minutes % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

function addMinutesToTime(time: string, minutes: number): string {
  return minutesToTime(timeToMinutes(time) + minutes);
}
