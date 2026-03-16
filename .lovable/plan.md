

## Add Wildcard Info Note to Dashboard Event Card

### Change

**File: `src/components/dashboard/EventRow.tsx`**

After the `sectionStats` block (line 209) and before the status row (line 212), add a wildcard info note that shows:

> 🎲 At least **{min}** wildcard spots opening **{date/time}** — **{totalSpots}** total spots on this show

Where:
- **min** = `wildcardSection.slots` (reserved wildcard spots)
- **totalSpots** = total regular slots + reserved wildcard slots (the full show capacity the producer set up)
- Date/time from `wildcardSection.signup_opens_at`

This tells the producer both the guaranteed wildcard minimum AND the total show size they care about.

### Code

Extract computed values before the return (after line 180):

```tsx
const totalRegularSlots = sections.filter(s => s.type !== 'wildcard').reduce((sum, s) => sum + s.slots, 0);
const totalShowSpots = totalRegularSlots + (wildcardSection?.slots || 0);
```

Then insert between lines 209-211:

```tsx
{wildcardSection && !wildcardCutoffPassed && wildcardSection.signup_opens_at && (
  <p className="text-xs text-muted-foreground italic">
    🎲 At least {wildcardSection.slots} wildcard spot{wildcardSection.slots !== 1 ? 's' : ''} opening {formatDateTime(wildcardSection.signup_opens_at)} — {totalShowSpots} total spots on this show
  </p>
)}
```

Single file, ~6 lines added.

