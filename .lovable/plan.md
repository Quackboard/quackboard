

## Wildcard Section Feature

### Overview
Producers can add a "Wildcard" section to their event. At a cutoff date/time, all unfilled regular slots close and convert into wildcard slots. After the cutoff, only booked regular slots remain visible -- the unfilled ones disappear. Wildcard signups open at that same cutoff time.

### How It Works

**Before cutoff:**
```text
--- 5 MIN SPOTS ---
1. Alice
2. [Grab Spot]
3. Bob
4. [Grab Spot]

--- WILDCARDS ---
Opens Feb 20 at 6:00 PM
```

**After cutoff (2 regular spots were unfilled, so 2 wildcards appear):**
```text
--- 5 MIN SPOTS ---
1. Alice
2. --
3. Bob
4. --

--- WILDCARDS ---
1. [Grab Spot]
2. [Grab Spot]
```

Unfilled regular slots show as closed (no "Grab Spot" button). The 2 unfilled regular slots became 2 wildcard slots. As wildcard spots get booked, the count shrinks in real-time since it is computed from current bookings, not stored in the database.

### Data Model

No migration needed. Extend the existing `sections_config` JSONB:

```text
{
  "label": "Wildcards",
  "slots": 0,
  "type": "wildcard",
  "signup_opens_at": "2026-02-20T18:00:00Z"
}
```

- `slots: 0` is a placeholder -- actual count is computed at render time
- `type: "wildcard"` flags this section for dynamic behavior
- `signup_opens_at` is the cutoff time: regular unfilled slots close and wildcard signups open simultaneously
- Regular sections have no `type` field (implicitly "regular")

### Technical Changes

**`src/types/database.ts`**
- Add `type?: "regular" | "wildcard"` and `signup_opens_at?: string` to the `Section` interface

**`src/components/producer/SpotList.tsx`**
- Accept the wildcard-aware `Section` type (with optional `type` and `signup_opens_at`)
- Determine if a wildcard section exists and whether the cutoff has passed
- **Regular sections after cutoff**: render booked slots with guest names, render unfilled slots as a dash or "closed" (no "Grab Spot" button)
- **Wildcard section before cutoff**: show "Opens [formatted time]" message, no slots
- **Wildcard section after cutoff**: compute `availableWildcardSlots = totalRegularSlots - bookedRegularCount - bookedWildcardCount`, render that many "Grab Spot" buttons with slot positions starting after the last regular slot
- If `availableWildcardSlots` is 0, show "No wildcard spots available"
- Regular sections before cutoff (or when no wildcard exists): behavior unchanged

**`src/components/producer/EventCard.tsx`**
- Mobile availability summary: `totalSlots` = regular slots only, `bookedCount` = all bookings (regular + wildcard)
- No other changes needed

**`src/pages/CreateMic.tsx` and `src/pages/EditMic.tsx`**
- In the Sections Builder, add a "Wildcard" toggle (Switch) on each section row
- When toggled on:
  - Hide the "Spots" number input (count is dynamic)
  - Show a date/time picker for "Wildcard cutoff / signup opens at"
  - Default label to "Wildcards" (editable)
- Only one wildcard section per event (validate and show error if user tries to add a second)
- Update the zod schema: allow `slots` min of 0 when type is wildcard, add `signup_opens_at` validation (must be in the future, must be before event start time)
- On submit, serialize wildcard section as `{ label, slots: 0, type: "wildcard", signup_opens_at: isoString }`

**`src/pages/EventLineup.tsx`**
- For wildcard sections, compute and display the dynamic slot count
- Label as "Wildcards (X available)"

**`src/components/producer/SignUpModal.tsx`**
- No changes needed; it already receives `spotNumber` and `sectionLabel`

### Edge Cases
- All regular spots fill before cutoff: wildcard shows "0 spots available" after cutoff
- Regular booking cancelled after cutoff: wildcard available count increases by 1 (computed in real-time)
- Wildcard bookings use slot positions starting after the last regular slot (e.g., if 12 regular slots total, wildcards are 13, 14, ...) -- no conflicts
- One wildcard section max per event
- Events without a wildcard section behave exactly as they do today

