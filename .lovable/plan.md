

## Audit: Remove emoji from cancellation box + standardize cancel spelling

### Scope

Two concerns: (1) remove the 📧 emoji from the ProducerPage cancellation helper, and (2) standardize all user-facing cancel verb forms to single-l American English throughout the app and email edge functions.

**Note:** Database column names like `cancelled_at` and API codes like `already_cancelled` are left unchanged — renaming DB columns would require a migration and break existing queries across the entire codebase. Variable names that mirror DB columns (e.g., `cancelled_at` in TypeScript types) also stay as-is for consistency with the schema.

### Changes

**1. `src/pages/ProducerPage.tsx`** — Remove emoji
- Line 212: Remove `<span>📧</span>` from the cancellation helper div

**2. `src/pages/CancelBooking.tsx`** — Fix user-facing text + variable names
- Variable `isCancelling` → `isCanceling` (lines 66, 141, 186, 328, 331)
- Toast: `"Already cancelled"` → `"Already canceled"` (line 152)
- Toast: `"was already cancelled"` → `"was already canceled"` (line 153)
- Toast: `"Booking cancelled"` → `"Booking canceled"` (line 170)
- Toast: `"successfully cancelled"` → `"successfully canceled"` (line 171)
- Console: `"Error cancelling"` → `"Error canceling"` (line 179)
- Heading: `"Booking Cancelled"` → `"Booking Canceled"` (line 272)
- Description: `"has been cancelled"` → `"has been canceled"` (line 283)
- Button text: `"Cancelling..."` → `"Canceling..."` (line 334)

**3. `supabase/functions/cancel-booking/index.ts`** — Console log text
- Line 76: `"cancelled via token"` → `"canceled via token"`

**4. `supabase/functions/send-booking-email/index.ts`** — Already correct
- Email subjects/headings already use "Canceled" (single-l). No changes needed.

### Not changed (intentionally)
- `cancelled_at` — database column name, would require a migration
- `already_cancelled` — API response code, used in client-side conditionals
- `isCancellation` — noun form, already correct per user's rule ("cancellation" is fine)
- Emojis in email templates (🎤, ✅) — these are in email subject lines and headings, not the app UI; separate design concern
- `cancelled_at` references in TypeScript types/queries — these match the DB column

