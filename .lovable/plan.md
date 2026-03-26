

## Plan: Always-Visible Muted X Next to Booked Names

### Change

**`src/components/producer/SpotList.tsx`**
- For both regular and wildcard booked rows, change the X icon from `opacity-0 group-hover/name:opacity-100` to always visible with muted styling (`opacity-40` or `text-muted-foreground/40`)
- On hover/tap, the X becomes slightly more prominent (`hover:opacity-100` / `hover:text-destructive`)
- The click behavior stays the same -- tapping the name or X opens the CancelSpotModal

### What stays the same
- CancelSpotModal flow, edge function, email verification
- Slot numbering, wildcard logic, "Grab Spot" buttons

