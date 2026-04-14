

## Fix: Timezone bug in low-signup alert edge function

### Root cause

The function computes `now()` in UTC (correct), then builds the event datetime as:
```js
new Date(`${e.date}T${e.start_time}`)
```
This is parsed as **UTC**, but the stored date/time values represent **America/Los_Angeles local time**. A 7:30 PM LA event becomes 7:30 PM UTC (= 12:30 PM PDT), so the 2-hour window check fires ~7 hours too early.

### Fix

**File: `supabase/functions/check-low-signup-alert/index.ts`**

1. **Convert event date+time to a proper UTC timestamp by applying the LA offset.** Use a helper that constructs the event datetime in America/Los_Angeles and converts to UTC for comparison:

```ts
// At the top of the function
function eventToUTC(dateStr: string, timeStr: string): Date {
  // Build an ISO string with explicit LA timezone interpretation
  // Using Intl to get the current UTC offset for LA
  const naive = new Date(`${dateStr}T${timeStr}`);
  const laString = naive.toLocaleString("en-US", { timeZone: "America/Los_Angeles" });
  const utcString = naive.toLocaleString("en-US", { timeZone: "UTC" });
  const diff = new Date(utcString).getTime() - new Date(laString).getTime();
  return new Date(naive.getTime() + diff);
}
```

Or more reliably, use `Intl.DateTimeFormat` to compute the offset:

```ts
function eventLocalToUTC(dateStr: string, timeStr: string, tz = "America/Los_Angeles"): Date {
  // Parse components
  const [y, mo, d] = dateStr.split("-").map(Number);
  const [h, mi, s] = timeStr.split(":").map(Number);
  
  // Create a date assuming UTC, then find what that instant looks like in LA
  // Iterate to find the UTC instant where the LA wall-clock matches our target
  let guess = Date.UTC(y, mo - 1, d, h, mi, s || 0);
  for (let i = 0; i < 2; i++) {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false
    }).formatToParts(new Date(guess));
    const get = (t: string) => parseInt(parts.find(p => p.type === t)!.value);
    const laUTC = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour") % 24, get("minute"), get("second"));
    const target = Date.UTC(y, mo - 1, d, h, mi, s || 0);
    guess += target - laUTC;
  }
  return new Date(guess);
}
```

2. **Replace the naive parse on ~line 80:**
```ts
// Before (BUG):
const eventDateTime = new Date(`${e.date}T${e.start_time}`);

// After:
const eventDateTime = eventLocalToUTC(e.date, e.start_time);
```

3. **No other changes needed.** The `now()`, `windowStart`, and `windowEnd` are already in UTC. Once `eventDateTime` is also correctly in UTC, the comparison works.

### Verification

For a 7:30 PM PDT event on 4/14:
- PDT offset = UTC-7, so 7:30 PM PDT = 2:30 AM UTC on 4/15
- The alert window (1.5–2.5h before) = 12:00 AM – 1:00 AM UTC on 4/15
- That's 5:00 PM – 6:00 PM PDT on 4/14 — alert fires around 5:30 PM PDT as expected

### Risk

- Only touches `check-low-signup-alert/index.ts` — no other edge functions or frontend files
- No booking, signup, or mic setup logic affected
- The fix is isolated to how event datetimes are interpreted for the time-window comparison

