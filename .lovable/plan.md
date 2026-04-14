## Implement: Browse page past-mic filter + deep-link auto-expand

### 1. Hide past mics on Browse (DiscoverMics.tsx)

In the `filtered` useMemo (line 126), add a check: if `ev.date === todayStr`, parse `ev.end_time` against `nowLA` and exclude events whose end time has passed.

```ts
// Inside the filter callback, before the time-of-day check:
if (ev.date === todayStr) {
  const [h, m] = ev.end_time.split(':').map(Number);
  const endMinutes = h * 60 + m;
  const nowMinutes = nowLA.getHours() * 60 + nowLA.getMinutes();
  if (endMinutes <= nowMinutes) return false;
}
```

### 2. Add `&time=` to deep links (DiscoverMics.tsx)

Update the `deepLink` variable (line 265) to include `start_time`:

```ts
const deepLink = account?.slug ? `/${account.slug}?date=${ev.date}&time=${ev.start_time}` : null;
```

### 3. Read URL params + pass autoExpand (AccountPage.tsx)

- Import `useSearchParams` from react-router-dom.
- Read `date` and `time` query params.
- If `date` param exists, use it to initialize `selectedDate` (in the `useEffect` at line 150, set it from URL on first load).
- When rendering EventCards, pass `autoExpand={event.start_time === timeParam}` (only when `timeParam` is present).

### 4. Accept autoExpand prop (EventCard.tsx)

- Add `autoExpand?: boolean` to `EventCardProps`.
- Initialize mobile `expanded` state: `useState(autoExpand ?? false)`.

### Files changed


| File                                    | What                                                        |
| --------------------------------------- | ----------------------------------------------------------- |
| `src/pages/DiscoverMics.tsx`            | Filter past end-time events; add `&time=` to deep links     |
| `src/pages/AccountPage.tsx`             | Read `date`+`time` from URL; pass `autoExpand` to EventCard |
| `src/components/producer/EventCard.tsx` | Accept + use `autoExpand` prop                              |


### Risk

Zero impact on regular account page visits (no params = existing behavior). No booking/signup/edge function changes. 

Do not touch any files or edge functionsexcept for what is listed above. 