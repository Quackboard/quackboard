# QuackBoard — Design & Implementation Evaluation

## 1. Strengths

### 1.1 Atomic Booking with Email Rollback
The `create-booking` Edge Function is the standout piece of backend design. It treats booking creation and email delivery as an atomic operation — if the confirmation email fails after retries, the booking is **deleted** so the slot is freed. This prevents the frustrating scenario where a comic claims a spot but never receives confirmation.

**File:** `supabase/functions/create-booking/index.ts` (lines 147–335)

### 1.2 Row Level Security (RLS)
Every table has RLS enabled, enforcing authorization at the database level rather than relying on application code. This means:
- Even if a frontend bug exposes a query, PostgreSQL rejects unauthorized access.
- Edge Functions that need elevated access explicitly use the service role key.
- Public data (published events, active bookings) is properly scoped.

### 1.3 Real-Time Updates via Supabase Realtime
`ProducerPage.tsx` subscribes to Postgres changes on the `bookings` table. When any comic signs up, all other visitors see the spot fill in real time without polling. This is critical for a "land rush" scenario where popular spots fill quickly.

**File:** `src/pages/ProducerPage.tsx` (lines 106–126)

### 1.4 Clean Component Separation
The codebase follows a clear separation:
- `pages/` for route-level components.
- `components/<domain>/` for feature-specific components.
- `components/ui/` for generic primitives.
- `hooks/` for reusable logic.
- `lib/` for utilities with no React dependencies.

This makes it straightforward to find and modify any piece of functionality.

### 1.5 Form Draft Persistence
The `useFormDraft` hook auto-saves `react-hook-form` state to localStorage. If a producer accidentally closes the browser while creating a complex event, their work is preserved. This is a thoughtful UX detail.

**File:** `src/hooks/useFormDraft.ts`

### 1.6 Slug-Based URLs with UUID Backward Compatibility
Producer pages use human-readable slugs (`/producer/sarah-comedy`), but the system still handles UUID-based URLs (`/producer/abc-123-...`) by looking up the producer and redirecting. This gracefully handles old links.

**File:** `src/pages/ProducerPage.tsx` (lines 26–58), `src/lib/slug.ts`

### 1.7 Wildcard Section Design
The wildcard system is genuinely clever — unfilled regular spots automatically become wildcard capacity at a specified cutoff time. The real-time countdown timer with tab-visibility correction shows attention to the live-event use case.

### 1.8 Email Notification Frequency Options
Giving producers control over notification frequency (none/immediate/daily/weekly/monthly) per event is a strong UX choice. Cancellation emails always bypass this setting and send immediately, which is the right trade-off.

### 1.9 Comprehensive Email Audit Trail
Every email attempt — successful or failed — is logged to `message_logs` with the delivery status. This is essential for debugging delivery issues.

---

## 2. Concerns & Risks

### 2.1 Hardcoded Supabase Credentials
**Severity:** Low (by design, but worth noting)

The Supabase URL and anon key are hardcoded in `src/integrations/supabase/client.ts`:

```typescript
const SUPABASE_URL = "https://dkbahxjibpobbefqufqa.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIs...";
```

The anon key is designed to be public (it only grants RLS-scoped access), so this isn't a security vulnerability. However, it makes environment switching (dev/staging/prod) impossible without code changes. The `.env.example` file defines `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`, but the client doesn't read them.

**Recommendation:** Read from `import.meta.env.VITE_SUPABASE_URL` with a fallback.

### 2.2 Duplicated Email HTML Templates
**Severity:** Medium

Email HTML is duplicated across multiple Edge Functions:
- `create-booking/index.ts` — guest email (~80 lines of HTML), producer email (~80 lines of HTML)
- `send-booking-email/index.ts` — guest email (~80 lines), producer email (~80 lines)
- `send-mic-goes-live-email/index.ts` — producer email (~90 lines)
- `send-producer-notifications/index.ts` — digest email

Each function builds its own HTML string with inline styles. If the email branding needs to change (colors, layout, logo), every function must be updated independently.

**Recommendation:** Extract shared email components into `supabase/functions/_shared/` (similar to how `auth-email-hook` already uses shared templates). Create a `buildEmailShell(header, body)` function.

### 2.3 `create-booking` and `send-booking-email` Overlap
**Severity:** Medium

There are two paths for booking email delivery:
1. `create-booking` — builds and sends emails inline (the current primary path).
2. `send-booking-email` — a separate function that the frontend can call, and that `cancel-booking` invokes internally.

Both functions contain nearly identical email HTML and Zeptomail calling logic. This dual-path approach likely evolved organically (the original flow used `send-booking-email` from the frontend, then `create-booking` was added for atomicity).

**Recommendation:** Have `create-booking` delegate email sending to `send-booking-email` (via internal fetch, like `cancel-booking` does), eliminating the duplicated email logic.

### 2.4 Alert Preferences in localStorage
**Severity:** Low

Comic alert frequency preferences (`CancelBooking.tsx`, line 197) are stored in localStorage keyed by email:
```typescript
localStorage.setItem(`alert_freq_${booking.guest_email}`, alertFrequency);
```

This means preferences are lost when the comic uses a different browser/device. The code itself acknowledges this with a comment: *"In production, you might want to store this in a database table"*.

**Recommendation:** Store preferences in a `comic_preferences` table keyed by email, or extend `comic_profiles`.

### 2.5 Minimal Test Coverage
**Severity:** Medium-High

The only test files found are:
- `src/components/producer/SpotList.test.tsx`
- `supabase/functions/create-booking/index.test.ts`

No tests exist for:
- Other components or pages.
- Other Edge Functions.
- The email utility wrappers (`src/lib/email.ts`).
- Slug validation logic.
- Form schemas.

The Zod schemas, slug validation, and email retry logic are all highly testable pure functions.

**Recommendation:** Prioritize tests for:
1. Edge Functions (especially `cancel-booking` and `send-booking-email` — they handle financial-grade transactional logic).
2. Zod form schemas in `CreateMic.tsx`.
3. `slug.ts` validation.
4. The wildcard slot calculation logic in `SpotList.tsx` and `EventLineup.tsx`.

### 2.6 STUB_EMAILS Workaround
**Severity:** Low

Several Edge Functions include a `[TEMP STUB]` comment:
```typescript
// [TEMP STUB] Token check bypassed - no Zeptomail credits
```

This suggests Zeptomail credits have been exhausted at some point, and stub mode was used as a workaround. The `STUB_EMAILS` mechanism is well-designed, but the temporary bypass of token validation in some functions (`send-mic-goes-live-email`, `send-producer-notifications`) is concerning — it means these functions can run without email actually being sent, potentially hiding delivery failures.

**Recommendation:** Remove `[TEMP STUB]` bypasses and rely solely on the `STUB_EMAILS` env var.

### 2.7 No Rate Limiting on Public Booking Endpoint
**Severity:** Medium

The `create-booking` Edge Function has no rate limiting. A malicious actor could:
- Fill all spots on an event with fake bookings.
- Trigger many Zeptomail API calls (costing credits).
- Generate excessive `message_logs` entries.

The duplicate-email check mitigates some abuse (one booking per email per event), but doesn't prevent different emails from being used.

**Recommendation:** Add per-IP or per-email rate limiting at the Edge Function level, or use Supabase's built-in rate limiting features.

### 2.8 Large Edge Function Files
**Severity:** Low

`create-booking/index.ts` (469 lines) and `send-booking-email/index.ts` (521 lines) are large files with embedded HTML templates. This makes them harder to review, test, and maintain.

**Recommendation:** Split into modules: request validation, database operations, email template building, and Zeptomail sending.

### 2.9 Admin Page Not Protected
**Severity:** Medium

The `/admin` route is not wrapped in `<ProtectedRoute>`:
```tsx
<Route path="/admin" element={<Admin />} />
```

If the `Admin` component doesn't implement its own authorization check, it may be accessible to any visitor.

**Recommendation:** Verify that `Admin.tsx` has internal auth checks. If not, either wrap it in `ProtectedRoute` or add an admin role check.

### 2.10 Two Toast Systems
**Severity:** Low

The app uses both shadcn's `Toaster` (from `@radix-ui/react-toast`) and `Sonner`. Different parts of the codebase use different toast hooks. This isn't a bug, but it adds maintenance overhead and may cause inconsistent notification styling.

**Recommendation:** Consolidate to one toast system.

---

## 3. Scalability Considerations

| Area | Current State | At Scale |
|------|--------------|----------|
| **Database** | Supabase managed PostgreSQL | Scales well for thousands of producers/events. Booking queries with `.in('event_id', ids)` should have indexes. |
| **Edge Functions** | Cold starts possible on Deno | Acceptable for booking creation (user waits). Consider connection pooling for high-traffic events. |
| **Realtime** | Single channel for all booking changes | May need per-event channels if hundreds of concurrent viewers cause excessive message broadcasts. |
| **Email delivery** | Zeptomail with 3 retries | Zeptomail rate limits may apply for popular events with many simultaneous bookings. Consider queuing. |
| **Frontend** | SPA with React Query caching | Good. Pagination would help if a producer has hundreds of past events. |
| **Wildcard calculation** | Computed client-side | Fine for typical section sizes (5–30 slots). |

---

## 4. Improvement Suggestions Summary

| Priority | Suggestion | Effort |
|----------|-----------|--------|
| **High** | Add tests for Edge Functions and core business logic | Medium |
| **High** | Add rate limiting to `create-booking` | Low |
| **Medium** | Extract shared email templates to `_shared/` | Medium |
| **Medium** | Deduplicate `create-booking` and `send-booking-email` email logic | Medium |
| **Medium** | Verify `/admin` route authorization | Low |
| **Low** | Read Supabase credentials from env vars | Low |
| **Low** | Move alert preferences from localStorage to database | Low |
| **Low** | Consolidate toast systems | Low |
| **Low** | Remove `[TEMP STUB]` token bypasses | Low |
| **Low** | Split large Edge Function files into modules | Medium |
