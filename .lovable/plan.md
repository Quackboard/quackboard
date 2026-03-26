

## Plan: Limit Public Producer Page to 7-Day Window

### What Changes

**`src/pages/ProducerPage.tsx`** — one filter change

Currently, `currentEvents` filters out past events only:
```ts
const currentEvents = (events || []).filter(e => !isEventPast(e));
```

Change to also exclude events more than 7 days out:
```ts
const sevenDaysFromNow = addDays(new Date(), 7);
const currentEvents = (events || []).filter(e => {
  if (isEventPast(e)) return false;
  const eventDate = new Date(`${e.date}T${e.start_time}`);
  return eventDate <= sevenDaysFromNow;
});
```

Import `addDays` from `date-fns`.

### What Stays the Same
- Dashboard shows all events (upcoming + past tabs) — no change
- Past events already hidden on public page — no change needed
- Calendar view, list view, booking flows — untouched

### Single file, single filter addition. No database changes.

