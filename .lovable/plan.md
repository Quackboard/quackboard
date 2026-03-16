

## Updated Wildcard Logic

### Summary of behavior change

**Before cutoff:** Wildcard section is completely hidden (no label, no "opens at" message). Regular slots are visible and bookable as normal.

**At cutoff:** Regular sections lock — booked slots show names, unbooked slots disappear entirely. Wildcard section appears with slots = `unfilledRegularSlots + reservedWildcardSlots`. Comedians book wildcard slots.

**Formula:** `wildcardSlots = unfilledRegular + reserved`, `available = wildcardSlots - bookedWildcard` (clamped to 0).

### Rename in CreateMic & EditMic

Rename "Guaranteed spots" to "Reserved wildcard spots". Replace helper text with a dynamic summary line:

> "This show will have [totalRegularSlots + reservedSlots] total spots: [totalRegularSlots] regular + [reservedSlots] guaranteed wildcard"

This requires reading `totalRegularSlots` from the form's other sections via `watch`.

---

### File changes

#### 1. `src/components/producer/SpotList.tsx`

**Formula (line 132-133):** Change to:
```ts
const reservedWildcardSlots = wildcardSection?.slots || 0;
const unfilledRegularSlots = totalRegularSlots - bookedRegularCount;
const totalWildcardSlots = unfilledRegularSlots + reservedWildcardSlots;
const availableWildcardSlots = Math.max(0, totalWildcardSlots - bookedWildcardCount);
```

**Before cutoff (lines 142-164):** Hide the wildcard section entirely — return `null` instead of rendering the "opens at" message and label.

**After cutoff — regular sections (lines 286-309):** Only render slots that have bookings. Skip unbooked slots (no dash, no button — they just disappear). If a section has zero bookings, hide the entire section.

#### 2. `src/pages/EventLineup.tsx`

**Formula (lines 126-127):** Same change:
```ts
const reservedWildcardSlots = sections.find(s => s.type === 'wildcard')?.slots || 0;
const unfilledRegularSlots = totalRegularSlots - bookedRegularCount;
const totalWildcardSlots = unfilledRegularSlots + reservedWildcardSlots;
const availableWildcardSlots = Math.max(0, totalWildcardSlots - bookedWildcardCount);
```

**Regular sections after cutoff:** In `getSectionSlots()`, when a wildcard section exists and cutoff has passed, filter regular section slots to only include booked positions.

#### 3. `src/pages/CreateMic.tsx`

**Label & helper (lines 663-673):** Rename "Guaranteed spots" to "Reserved wildcard spots". Replace the `<p>` helper text with a dynamic summary using `watch` to compute total regular slots:
```
This show will have {totalRegularSlots + reservedSlots} total spots: {totalRegularSlots} regular + {reservedSlots} guaranteed wildcard
```

#### 4. `src/pages/EditMic.tsx`

**Label & helper (lines 935-945):** Same rename and dynamic summary as CreateMic.

#### 5. `src/components/dashboard/EventRow.tsx`

After cutoff, regular section totals should only count booked slots (matching the new "disappear" behavior). This aligns with the previous conversation's intent.

### Files NOT changed

EventCard, edge functions, database, booking flow — all untouched.

