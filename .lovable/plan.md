

## Fix: Booking Flicker on Cancellation

### What happened

When spot 4 was cancelled, the Realtime subscription triggered `queryClient.invalidateQueries()` for bookings. During the refetch, React Query briefly cleared the cached bookings data, causing a render frame where `bookings` was empty/undefined. This made spot 5 (and all other booked spots) momentarily disappear before the fresh data arrived and re-rendered everything.

No data was lost — it was a visual flicker.

### Fix

**`src/pages/ProducerPage.tsx`** — Add `placeholderData: (prev) => prev` to the bookings query (line ~82). This tells React Query to keep showing the previous bookings while the refetch is in progress, eliminating the flicker.

```ts
const { data: bookings } = useQuery({
  queryKey: ['event-bookings', eventIds],
  queryFn: async () => { ... },
  enabled: eventIds.length > 0,
  placeholderData: (prev) => prev,  // <-- keep old data during refetch
});
```

One line change. No other files affected.

