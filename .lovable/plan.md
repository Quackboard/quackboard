

## Guaranteed Wildcard Spots — Implementation Plan

### What Changes

Four files get surgical edits. No changes to EventCard, edge functions, database, or booking flow.

### 1. `src/pages/CreateMic.tsx`

**Submit logic (line 260):** Change `slots: 0` to `slots: s.slots` so the producer's guaranteed spots value is persisted.

**Wildcard section UI (after line 662, before the closing helper text):** Add a "Guaranteed spots" number input:
```
<div className="space-y-2">
  <Label className="text-sm">Guaranteed spots</Label>
  <Input type="number" min={0} placeholder="0" {...register(`sections.${index}.slots`, { valueAsNumber: true })} />
  <p className="text-xs text-muted-foreground">
    At minimum this many spots will be available, even if all regular spots are filled. Unfilled regular spots may increase this number.
  </p>
</div>
```

**Helper text (line 663-665):** Remove the old helper text ("Unfilled regular spots become available...") since the new input's helper text replaces it.

### 2. `src/pages/EditMic.tsx`

**Submit logic (line 433):** Change `slots: 0` to `slots: s.slots`.

**Wildcard section UI (after line 933, before line 935):** Add the same "Guaranteed spots" input and helper text as CreateMic.

**Helper text (line 935-937):** Remove the old helper text.

### 3. `src/components/producer/SpotList.tsx`

**Formula (line ~132):** Change:
```ts
const availableWildcardSlots = Math.max(0, totalRegularSlots - bookedRegularCount - bookedWildcardCount);
```
To:
```ts
const guaranteedSlots = wildcardSection?.slots || 0;
const availableWildcardSlots = Math.max(0, Math.max(totalRegularSlots - bookedRegularCount, guaranteedSlots) - bookedWildcardCount);
```

**Before-cutoff message (line ~142):** Change the "Opens" message to show the guaranteed minimum:
```
{guaranteedSlots > 0
  ? `${guaranteedSlots}+ wildcard spots will open ${format(...)}`
  : `Opens ${format(...)}`}
```
The countdown variant also gets the same prefix when `guaranteedSlots > 0`.

### 4. `src/pages/EventLineup.tsx`

**Formula (line 126):** Same change as SpotList:
```ts
const guaranteedSlots = sections.find(s => s.type === 'wildcard')?.slots || 0;
const availableWildcardSlots = Math.max(0, Math.max(totalRegularSlots - bookedRegularCount, guaranteedSlots) - bookedWildcardCount);
```

No other files are touched. The wildcard feature gate (`hasFeature('wildcard')`) remains unchanged — only producers with the feature see these controls.

