

## Plan: Add date to UpcomingEventCard and make it more compact

### Changes — single file: `src/components/dashboard/UpcomingEventCard.tsx`

**1. Add formatted date display**

Format `event.date` as `ddd MM/DD/YYYY` (e.g. "Fri 04/04/2026") using `date-fns`.

**2. Compact layout — put title, date, and time on one line**

- **Desktop**: Single row with title, date, and time range inline, then spots/status below. Reduces card height significantly.
  - Layout: `Title · Fri 04/04/2026 · 7:00 PM – 9:00 PM`
  - Spots info and signup status stay on a second line.
  
- **Mobile**: Stack into two lines max:
  - Line 1: Title · Date
  - Line 2: Time range · Spots info
  - Use `flex-wrap` and smaller text to keep it readable.

**3. Responsive approach**

Use Tailwind responsive classes (`sm:` breakpoint) to switch between stacked mobile layout and inline desktop layout. Keep 44px touch targets on buttons.

### What is NOT touched
- ProducerPage, booking flow, signup flow, edge functions, other dashboard sections

