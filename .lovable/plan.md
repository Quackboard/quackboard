

## Fix: Interleave Wildcard Slots (Backwards Compatible)

### Problem
Wildcard slots render in two blocks: all booked names first, then all "Grab Spot" buttons. When someone grabs a low-numbered position (e.g., slot 9), after refresh they jump to the top of the booked block because 9 < 11.

### Fix
Replace the two separate render blocks (lines 171-220) with a single interleaved loop that walks all wildcard positions in order, rendering either a name or a "Grab Spot" button at each position.

**File:** `src/components/producer/SpotList.tsx` — lines 171-220 only

```typescript
<div className="space-y-1 mt-2">
  {(() => {
    const occupied = new Map(
      wildcardBookings.map(b => [b.slot_position, b])
    );
    // Total positions = booked + available
    const totalPositions = wildcardBookings.length + availableWildcardSlots;
    let nextPos = totalRegularSlots + 1;
    return Array.from({ length: totalPositions }, () => {
      // Walk to next position that is either occupied or available
      const slotPos = nextPos;
      nextPos++;
      displayCounter++;
      const booking = occupied.get(slotPos);
      // Skip positions beyond what we need (shouldn't happen, but safety)
      return (
        <div
          key={booking ? booking.id : `wc-${slotPos}`}
          className="flex items-center gap-3 py-1.5 px-2 rounded-md"
        >
          <span className="w-6 text-sm font-mono text-muted-foreground">
            {displayCounter}.
          </span>
          {booking ? (
            <span className="text-sm text-foreground font-medium">
              {booking.guest_name}
            </span>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => openModal(slotPos, section.label)}
              className="h-7 text-xs px-3"
            >
              Grab Spot
            </Button>
          )}
        </div>
      );
    });
  })()}
</div>
```

### Backwards compatibility guarantees
- **No database changes** — no migrations, no schema changes
- **No backend changes** — no edge function modifications
- **Existing bookings untouched** — slot_position values in the database stay exactly as they are
- **Same position calculation** — the gap-aware logic from the previous fix is preserved; positions are walked sequentially starting at `totalRegularSlots + 1`
- **Same availability math** — `availableWildcardSlots`, `totalWildcardSlots`, `bookedWildcardCount` calculations remain identical
- **Regular sections unchanged** — only the wildcard rendering block is modified
- **SignUpModal unchanged** — same `slotPos` values are passed to `openModal`
- **Same display numbering** — `displayCounter` still increments sequentially for the UI

### What changes (only)
- Visual order: booked and available wildcard slots now render interleaved by position instead of in two groups
- A newly booked spot stays in the same visual position it was grabbed from

