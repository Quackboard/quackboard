

## Problem Analysis

After the wildcard cutoff, the display numbers are wrong. Here's why:

With 4 regular slots and 2 reserved wildcard spots, if spots 1 and 3 are booked:
- Regular sections hide unbooked slots, showing: **1.** Name, **3.** Name
- Wildcard slots start at `totalRegularSlots + 1` = **5.**, **6.**, **7.**, **8.**

The user sees: 1, 3, 5, 6, 7, 8 — gaps and high numbers that don't make sense.

## Proposed Fix: Display-only sequential renumbering

**Approach**: After the wildcard cutoff, renumber all *visible* spots sequentially (1, 2, 3...) for display purposes only. The actual `slot_position` values sent to the database for bookings remain unchanged.

**What changes in `SpotList.tsx`**:

1. After cutoff, collect all visible items in order:
   - Booked regular slots (from all sections)
   - Booked wildcard slots
   - Available wildcard "Grab Spot" buttons

2. Assign display numbers 1, 2, 3... to each visible item sequentially.

3. Keep the real `slot_position` for the `openModal()` call and booking data — only the displayed number changes.

**Before fix**: 1. Alice, 3. Bob, 5. [Grab Spot], 6. [Grab Spot], 7. [Grab Spot], 8. [Grab Spot]
**After fix**: 1. Alice, 2. Bob, 3. [Grab Spot], 4. [Grab Spot], 5. [Grab Spot], 6. [Grab Spot]

**Scope**: Front-end only change in `SpotList.tsx`. No database or API changes. The `slot_position` used for booking creation is untouched.

**Risk**: Minimal — this is purely cosmetic numbering. The booking system continues to use the real slot positions internally.

