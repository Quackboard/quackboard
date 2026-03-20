

## Fix: Wildcard Spot Position Collision (line 192)

### The Problem

**Line 192** has the broken formula:
```
const slotPos = totalRegularSlots + bookedWildcardCount + i + 1;
```

This assumes wildcard bookings fill positions contiguously (9, 10, 11, 12...), but in reality there are gaps (e.g., 11, 13, 14, 15 are taken; 9, 10, 12 are free). The formula proposes positions 13, 14, 15 — already occupied — causing "slot taken" errors.

### The Fix

Replace lines 190-211 with logic that finds the next *actually available* position:

```typescript
{/* Show available wildcard slots */}
{(() => {
  const occupiedPositions = new Set(
    wildcardBookings.map(b => b.slot_position)
  );
  let nextPos = totalRegularSlots + 1;
  return Array.from({ length: availableWildcardSlots }, () => {
    while (occupiedPositions.has(nextPos)) nextPos++;
    const slotPos = nextPos;
    nextPos++;
    displayCounter++;
    return (
      <div
        key={`wc-${slotPos}`}
        className="flex items-center gap-3 py-1.5 px-2 rounded-md"
      >
        <span className="w-6 text-sm font-mono text-muted-foreground">
          {displayCounter}.
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => openModal(slotPos, section.label)}
          className="h-7 text-xs px-3"
        >
          Grab Spot
        </Button>
      </div>
    );
  });
})()}
```

### What stays the same
- **Booked wildcard slots** (lines 173-188): untouched — existing names display as-is
- **Booked regular slots**: untouched — no renumbering or position changes
- **Backend**: no changes to create-booking edge function, database, or constraints
- **Display numbering** (`displayCounter`): unchanged — sequential UI numbering still works

### What changes
- Only the `slotPos` value sent when clicking "Grab Spot" — it now correctly targets unoccupied positions (9, 10, 12 in the current case) instead of already-taken ones (13, 14, 15)

### Single file change
`src/components/producer/SpotList.tsx` — lines 190-211 only

