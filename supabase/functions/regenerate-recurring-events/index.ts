// Daily cron-invoked function. Maintains a rolling 30-day window of events
// for every active recurring template. Picks up exactly where the previous
// generation left off — no gaps, no duplicates.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface RecurrenceRule {
  frequency: "weekly" | "hourly" | "monthly";
  interval: number;
  days?: number[];
  time_start: string;
  time_end?: string;
  duration_minutes: number;
  month_day?: number;
  month_week?: number;
  month_weekday?: number;
}

interface GeneratedEvent {
  date: string;
  start_time: string;
  end_time: string;
}

// ── Date helpers (UTC-based ymd math) ──
function ymd(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function parseYmd(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}
function addDaysUTC(d: Date, n: number): Date {
  const x = new Date(d.getTime());
  x.setUTCDate(x.getUTCDate() + n);
  return x;
}
function dowUTC(d: Date): number {
  return d.getUTCDay();
}
function lastDayOfMonthUTC(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0));
}
function timeToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + (m || 0);
}
function minutesToTime(min: number): string {
  const h = Math.floor(min / 60) % 24;
  const m = min % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}
function addMinutesToTime(t: string, min: number): string {
  return minutesToTime(timeToMinutes(t) + min);
}
function normalizeTime(t: string): string {
  // DB returns "HH:MM:SS"; rule stores "HH:MM". Normalize to "HH:MM".
  return t.length >= 5 ? t.slice(0, 5) : t;
}

// ── Generator: instances within [start, end] inclusive ──
function generateEvents(
  start: Date,
  end: Date,
  rule: RecurrenceRule,
  seriesAnchor: Date,
): GeneratedEvent[] {
  if (start.getTime() > end.getTime()) return [];
  if (rule.frequency === "weekly" || rule.frequency === "hourly") {
    return genWeeklyOrHourly(start, end, rule, seriesAnchor);
  }
  if (rule.frequency === "monthly") return genMonthly(start, end, rule);
  return [];
}

function genWeeklyOrHourly(
  start: Date,
  end: Date,
  rule: RecurrenceRule,
  seriesAnchor: Date,
): GeneratedEvent[] {
  const out: GeneratedEvent[] = [];
  const days = rule.days || [];
  if (days.length === 0) return out;
  const anchorWeekStart = addDaysUTC(seriesAnchor, -dowUTC(seriesAnchor));

  let cursor = start;
  while (cursor.getTime() <= end.getTime()) {
    if (days.includes(dowUTC(cursor))) {
      let include = true;
      if (rule.interval === 2) {
        const thisWeekStart = addDaysUTC(cursor, -dowUTC(cursor));
        const weeks = Math.round(
          (thisWeekStart.getTime() - anchorWeekStart.getTime()) /
            (7 * 86400_000),
        );
        include = weeks % 2 === 0;
      }
      if (include) {
        if (rule.frequency === "hourly" && rule.time_end) {
          let cur = timeToMinutes(rule.time_start);
          const last = timeToMinutes(rule.time_end);
          while (cur <= last) {
            out.push({
              date: ymd(cursor),
              start_time: minutesToTime(cur),
              end_time: minutesToTime(cur + rule.duration_minutes),
            });
            cur += rule.duration_minutes;
          }
        } else {
          out.push({
            date: ymd(cursor),
            start_time: rule.time_start,
            end_time: addMinutesToTime(rule.time_start, rule.duration_minutes),
          });
        }
      }
    }
    cursor = addDaysUTC(cursor, 1);
  }
  return out;
}

function genMonthly(
  start: Date,
  end: Date,
  rule: RecurrenceRule,
): GeneratedEvent[] {
  const out: GeneratedEvent[] = [];
  const first = new Date(
    Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 1),
  );
  for (
    let m = first;
    m.getTime() <= end.getTime();
    m = new Date(Date.UTC(m.getUTCFullYear(), m.getUTCMonth() + 1, 1))
  ) {
    let d: Date | null = null;
    if (rule.month_day !== undefined) {
      const lastDay = lastDayOfMonthUTC(m).getUTCDate();
      d = rule.month_day === -1
        ? lastDayOfMonthUTC(m)
        : new Date(
          Date.UTC(
            m.getUTCFullYear(),
            m.getUTCMonth(),
            rule.month_day > lastDay ? lastDay : rule.month_day,
          ),
        );
    } else if (
      rule.month_week !== undefined &&
      rule.month_weekday !== undefined
    ) {
      d = nthDayOfMonth(
        m.getUTCFullYear(),
        m.getUTCMonth(),
        rule.month_weekday,
        rule.month_week,
      );
    }
    if (d && d.getTime() >= start.getTime() && d.getTime() <= end.getTime()) {
      out.push({
        date: ymd(d),
        start_time: rule.time_start,
        end_time: addMinutesToTime(rule.time_start, rule.duration_minutes),
      });
    }
  }
  return out;
}

function nthDayOfMonth(
  year: number,
  month: number,
  dow: number,
  week: number,
): Date | null {
  const firstOfMonth = new Date(Date.UTC(year, month, 1));
  const offset = (dow - firstOfMonth.getUTCDay() + 7) % 7;
  const first = addDaysUTC(firstOfMonth, offset);
  if (week === -1) {
    const last = lastDayOfMonthUTC(firstOfMonth);
    let d = first;
    while (addDaysUTC(d, 7).getTime() <= last.getTime()) d = addDaysUTC(d, 7);
    return d;
  }
  const result = addDaysUTC(first, (week - 1) * 7);
  if (result.getUTCMonth() !== month) return null;
  return result;
}

function calcSignupOpensAt(opts: {
  eventDate: string;
  eventStartTime: string;
  mode: "rolling" | "fixed";
  rollingHours?: number | null;
  anchorDay?: number | null;
  anchorTime?: string | null;
}): string | null {
  const startHHMM = normalizeTime(opts.eventStartTime);
  if (opts.mode === "rolling" && opts.rollingHours != null) {
    const eventMs = new Date(`${opts.eventDate}T${startHHMM}:00Z`).getTime();
    if (Number.isNaN(eventMs)) return null;
    return new Date(eventMs - opts.rollingHours * 3600_000).toISOString();
  }
  if (opts.mode === "fixed" && opts.anchorDay != null && opts.anchorTime) {
    const anchorHHMM = normalizeTime(opts.anchorTime);
    const eventDateObj = parseYmd(opts.eventDate);
    let daysBack = dowUTC(eventDateObj) - opts.anchorDay;
    if (daysBack <= 0) daysBack += 7;
    const anchor = addDaysUTC(eventDateObj, -daysBack);
    const ms = new Date(`${ymd(anchor)}T${anchorHHMM}:00Z`).getTime();
    if (Number.isNaN(ms)) return null;
    return new Date(ms).toISOString();
  }
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const today = parseYmd(ymd(new Date()));
  const horizon = addDaysUTC(today, 30);

  const summary = {
    templates_processed: 0,
    templates_skipped: 0,
    events_inserted: 0,
    errors: [] as Array<{ template_id: string; error: string }>,
  };

  try {
    const { data: templates, error: tErr } = await supabase
      .from("event_templates")
      .select(
        "id, producer_id, title, description, producer_message, venue_name, venue_address, sections_config, allow_multiple_slots, recurrence_rule, recurrence_end_date, signup_opens_hours_before, signup_anchor_day, signup_anchor_time, is_active",
      )
      .eq("is_active", true);
    if (tErr) throw tErr;

    for (const tpl of templates ?? []) {
      try {
        const rule = tpl.recurrence_rule as RecurrenceRule | null;
        if (!rule || !rule.frequency || !rule.time_start) {
          summary.templates_skipped++;
          continue;
        }

        // Pick up where we left off
        const { data: latest, error: lErr } = await supabase
          .from("events")
          .select("date")
          .eq("template_id", tpl.id)
          .gte("date", ymd(today))
          .order("date", { ascending: false })
          .limit(1);
        if (lErr) throw lErr;

        let windowStart = latest && latest.length > 0
          ? addDaysUTC(parseYmd(latest[0].date), 1)
          : today;
        if (windowStart.getTime() < today.getTime()) windowStart = today;

        let windowEnd = horizon;
        if (tpl.recurrence_end_date) {
          const endCap = parseYmd(tpl.recurrence_end_date);
          if (endCap.getTime() < windowEnd.getTime()) windowEnd = endCap;
        }

        if (windowStart.getTime() > windowEnd.getTime()) {
          summary.templates_processed++;
          continue;
        }

        // Anchor for interval=2 parity: earliest existing event for series
        const { data: earliest } = await supabase
          .from("events")
          .select("date")
          .eq("template_id", tpl.id)
          .order("date", { ascending: true })
          .limit(1);
        const seriesAnchor = earliest && earliest.length > 0
          ? parseYmd(earliest[0].date)
          : windowStart;

        const candidates = generateEvents(
          windowStart,
          windowEnd,
          rule,
          seriesAnchor,
        );
        if (candidates.length === 0) {
          summary.templates_processed++;
          continue;
        }

        // Defensive de-dup
        const { data: existing } = await supabase
          .from("events")
          .select("date, start_time")
          .eq("template_id", tpl.id)
          .gte("date", ymd(windowStart))
          .lte("date", ymd(windowEnd));
        const existingKeys = new Set(
          (existing ?? []).map((e: any) =>
            `${e.date}|${normalizeTime(e.start_time)}`
          ),
        );

        const signupMode: "rolling" | "fixed" =
          tpl.signup_opens_hours_before != null ? "rolling" : "fixed";

        const toInsert = candidates
          .filter((c) => !existingKeys.has(`${c.date}|${c.start_time}`))
          .map((c) => ({
            producer_id: tpl.producer_id,
            template_id: tpl.id,
            title: tpl.title,
            description: tpl.description,
            producer_message: tpl.producer_message,
            venue_name: tpl.venue_name,
            venue_address: tpl.venue_address,
            date: c.date,
            start_time: c.start_time,
            end_time: c.end_time,
            sections_config: tpl.sections_config,
            allow_multiple_slots: tpl.allow_multiple_slots,
            signup_opens_at: calcSignupOpensAt({
              eventDate: c.date,
              eventStartTime: c.start_time,
              mode: signupMode,
              rollingHours: tpl.signup_opens_hours_before,
              anchorDay: tpl.signup_anchor_day,
              anchorTime: tpl.signup_anchor_time,
            }),
            status: "published",
            is_info_only: false,
          }));

        if (toInsert.length > 0) {
          const { error: insErr } = await supabase
            .from("events")
            .insert(toInsert);
          if (insErr) throw insErr;
          summary.events_inserted += toInsert.length;
        }

        summary.templates_processed++;
      } catch (e: any) {
        summary.errors.push({
          template_id: tpl.id,
          error: e.message ?? String(e),
        });
      }
    }

    console.log("regenerate-recurring-events summary", summary);
    return new Response(
      JSON.stringify({ ok: true, ...summary, horizon: ymd(horizon) }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      },
    );
  } catch (err: any) {
    console.error("regenerate-recurring-events fatal", err);
    return new Response(
      JSON.stringify({ ok: false, error: err.message ?? String(err) }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      },
    );
  }
});
