# QuackBoard — Backend & API Contracts

## 1. Overview

QuackBoard has **no custom REST API server**. All backend logic lives in two places:

1. **Direct Supabase client queries** — The frontend uses `supabase.from('table').select(...)` for reads and simple writes. These go through PostgreSQL with RLS enforcement.
2. **Supabase Edge Functions** — Deno-based serverless functions invoked via `supabase.functions.invoke('function-name', { body })`. These handle operations that need the service role key (bypassing RLS), transactional logic, or external API calls (Zeptomail).

All Edge Functions live under `supabase/functions/` and are deployed via `supabase functions deploy <name>`.

---

## 2. Edge Function Inventory

| Function | Method | Auth Required | Purpose |
|----------|--------|---------------|---------|
| `create-booking` | POST | No (public) | Atomic booking creation + email delivery |
| `send-booking-email` | POST | Anon key | Send confirmation or cancellation email |
| `cancel-booking` | POST | No (token-based) | Cancel a booking by cancel_token |
| `cancel-booking-by-email` | POST | No | Cancel a booking by email address |
| `get-producer-events-embed` | GET | No (public) | Fetch producer + events for embed widget |
| `send-mic-goes-live-email` | POST | Anon key | Notify producer when their mic goes live |
| `send-producer-notifications` | POST | Anon key | Send a digest email to a specific producer |
| `send-daily-notifications` | POST | Anon key | Trigger daily digests for all producers |
| `send-weekly-notifications` | POST | Anon key | Trigger weekly digests for all producers |
| `send-monthly-notifications` | POST | Anon key | Trigger monthly digests for all producers |
| `auth-email-hook` | POST | Internal | Custom auth email templates (signup, recovery, etc.) |

---

## 3. Detailed Contracts

### 3.1 `create-booking`

**Purpose:** Atomic booking creation — inserts the booking, sends the guest confirmation email, and optionally sends the producer an immediate notification. If the guest email fails, the booking is **rolled back** (deleted).

**File:** `supabase/functions/create-booking/index.ts`

#### Request
```json
{
  "eventId": "uuid",
  "slotPosition": 3,
  "guestName": "Jane Doe",
  "guestEmail": "jane@example.com",
  "guestInstagram": "@janedoe",
  "allowMultipleSpots": false,
  "isManualAdd": false
}
```

#### Response (200)
```json
{
  "success": true,
  "bookingId": "uuid",
  "slotPosition": 3
}
```

#### Error Codes (returned in `code` field)
| Code | HTTP Status | Meaning |
|------|-------------|---------|
| `invalid_request` | 400 | Missing required fields |
| `duplicate_email` | 200 | Guest already has a booking for this event (when `allowMultipleSpots` is false) |
| `slot_taken` | 200 | Unique constraint violation — slot already occupied |
| `booking_failed` | 500 | Insert error, event fetch error, or email delivery failure (booking rolled back) |

#### Internal Steps
1. Duplicate email check (if `allowMultipleSpots` is false)
2. Generate `cancel_token` (UUID)
3. INSERT into `bookings`
4. Fetch event + producer data
5. Derive section label from `sections_config`
6. Build and send guest HTML email via Zeptomail (with retry)
7. If guest email fails → DELETE booking (rollback) + log failure
8. If guest email succeeds → log success → optionally send producer email (if `email_frequency` = "immediate")

---

### 3.2 `send-booking-email`

**Purpose:** Send a booking confirmation, manual-add notification, or cancellation email. Used by the frontend for legacy flows and by `cancel-booking` internally.

**File:** `supabase/functions/send-booking-email/index.ts`

#### Request
```json
{
  "bookingId": "uuid",
  "cancelToken": "uuid",
  "guestEmail": "jane@example.com",
  "guestName": "Jane Doe",
  "slotPosition": 3,
  "sectionLabel": "Regulars",
  "event": {
    "title": "Thursday Night Open Mic",
    "date": "2026-04-01",
    "start_time": "20:00",
    "end_time": "22:00",
    "venue_name": "The Comedy Store",
    "venue_address": "123 Main St",
    "producer_id": "uuid",
    "producer_message": "Bring 5 minutes of material"
  },
  "isManualAdd": false,
  "isCancellation": false
}
```

#### Response (200)
```json
{
  "success": true,
  "message": "Emails sent successfully",
  "guestStatus": "sent",
  "producerStatus": "sent"
}
```

#### Behavior
- Always sends guest email.
- Sends producer email only if:
  - `isCancellation` is true (always immediate), OR
  - `email_frequency` on the event is "immediate"
- Logs all emails to `message_logs` table.
- `producer_message` is parsed as Markdown (via `marked`) and rendered as HTML in the email body.

---

### 3.3 `cancel-booking`

**Purpose:** Cancel a booking using the unique `cancel_token`. Sets `cancelled_at` timestamp and triggers a cancellation email.

**File:** `supabase/functions/cancel-booking/index.ts`

#### Request
```json
{
  "cancelToken": "uuid"
}
```

#### Response (200)
```json
{
  "success": true
}
```

#### Error Codes
| Code | Meaning |
|------|---------|
| `invalid_request` | Missing or non-string cancelToken |
| `not_found` | No booking matches this token |
| `already_cancelled` | Booking already has a `cancelled_at` value |
| `server_error` | Database or unexpected error |

#### Internal Steps
1. Look up booking by `cancel_token` (service role, bypasses RLS)
2. Check not already cancelled
3. SET `cancelled_at = now()`
4. Fetch event + producer data
5. Derive section label from `sections_config`
6. Invoke `send-booking-email` internally with `isCancellation: true` (best-effort, non-blocking)

---

### 3.4 `get-producer-events-embed`

**Purpose:** Public endpoint for the embeddable calendar widget. Returns producer info and upcoming published events with booking availability.

**File:** `supabase/functions/get-producer-events-embed/index.ts`

#### Request
```
GET /functions/v1/get-producer-events-embed?slug=sarah-comedy
```

#### Response (200)
```json
{
  "producer": {
    "name": "Sarah Cotenoff",
    "venue_name": "The Comedy Lounge"
  },
  "events": [
    {
      "id": "uuid",
      "title": "Thursday Open Mic",
      "description": "...",
      "venue_name": "The Comedy Lounge",
      "venue_address": "456 Oak Ave",
      "date": "2026-04-03",
      "start_time": "19:00",
      "end_time": "21:00",
      "total_slots": 15,
      "booked_slots": 8
    }
  ]
}
```

#### Notes
- Accepts either a slug or UUID as the `slug` query parameter.
- Uses the producer's `timezone` to compute "today" for filtering (prevents premature event exclusion).
- Uses service role key to bypass RLS for public access.
- Returns at most 10 upcoming events.

---

### 3.5 `send-mic-goes-live-email`

**Purpose:** Notify the producer when their event status changes to "published" (goes live).

**File:** `supabase/functions/send-mic-goes-live-email/index.ts`

#### Request
```json
{
  "eventId": "uuid",
  "producerId": "uuid"
}
```

#### Response (200)
```json
{
  "success": true,
  "message": "Email sent successfully to producer@example.com",
  "emailSent": true,
  "recipient": "producer@example.com",
  "status": "sent"
}
```

---

### 3.6 `send-producer-notifications`

**Purpose:** Send a digest email to a specific producer summarizing bookings for a given time period.

**File:** `supabase/functions/send-producer-notifications/index.ts`

#### Request
```json
{
  "producerId": "uuid",
  "frequency": "daily",
  "date": "2026-03-28"
}
```

For weekly:
```json
{
  "producerId": "uuid",
  "frequency": "weekly",
  "weekStart": "2026-03-23"
}
```

For monthly:
```json
{
  "producerId": "uuid",
  "frequency": "monthly",
  "monthStart": "2026-03-01"
}
```

#### Response (200)
```json
{
  "success": true,
  "message": "Notification sent"
}
```

---

### 3.7 `send-daily-notifications` / `send-weekly-notifications` / `send-monthly-notifications`

**Purpose:** Cron-triggered functions that iterate over all producers with matching `email_frequency` and invoke `send-producer-notifications` for each.

**Files:**
- `supabase/functions/send-daily-notifications/index.ts`
- `supabase/functions/send-weekly-notifications/index.ts`
- `supabase/functions/send-monthly-notifications/index.ts`

#### Request
No body required (triggered by cron).

#### Response
```json
{
  "success": true,
  "message": "Daily notifications complete",
  "stats": { "sent": 5, "failed": 0, "skipped": 2 }
}
```

---

### 3.8 `auth-email-hook`

**Purpose:** Custom email templates for Supabase Auth events (signup confirmation, password recovery, magic link, email change, reauthentication, invite).

**File:** `supabase/functions/auth-email-hook/index.ts`

Uses shared templates from `supabase/functions/_shared/email-templates/`:
- `signup.tsx`
- `recovery.tsx`
- `magic-link.tsx`
- `email-change.tsx`
- `reauthentication.tsx`
- `invite.tsx`

---

## 4. Direct Supabase Client Queries

The frontend also makes direct queries via `supabase.from('table')`. Key patterns:

| Query | Used In | RLS Policy |
|-------|---------|------------|
| `producers.select('*').eq('slug', slug)` | ProducerPage | Public SELECT for any producer |
| `events.select('*').eq('producer_id', id).eq('status', 'published')` | ProducerPage | Public SELECT for published events |
| `bookings.select('...').in('event_id', ids).is('cancelled_at', null)` | ProducerPage, EventLineup | Public SELECT for active bookings |
| `events.select('...').eq('producer_id', user.id)` | Dashboard | Authenticated — own events only |
| `producers.select('slug').eq('id', user.id)` | ProtectedRoute, useProducerSlug | Authenticated — own record |
| `producer_features.select('feature').eq('producer_id', user.id)` | useProducerFeatures | Authenticated — own features |
| `bookings.update({ cancelled_at }).eq('id', bookingId)` | EventLineup (remove from lineup) | Authenticated — own event bookings |

---

## 5. Email Architecture

### Provider
**Zeptomail** (by Zoho) — a transactional email API. Called via REST (`https://api.zeptomail.com/v1.1/email`).

### Secrets (set via `supabase secrets set`)
| Secret | Purpose |
|--------|---------|
| `ZEPTOMAIL_API_TOKEN` | API authentication token |
| `ZEPTOMAIL_FROM_EMAIL` | Sender address (default: `noreply@quackboard.com`) |
| `ZEPTOMAIL_FROM_NAME` | Sender name (default: `QuackBoard`) |
| `FRONTEND_URL` | Base URL for links in emails (default: `https://quackboard1.lovable.app`) |
| `STUB_EMAILS` | Set to `"true"` to skip real email sends (logs to console instead) |

### Retry Logic
The `create-booking` Edge Function retries Zeptomail up to **3 attempts** with increasing backoff (1.5s, 3s). The frontend `email.ts` wrapper also retries up to **3 attempts** with 1.5s/3s/4.5s backoff.

### Email Types

| Email | Recipient | Trigger | Edge Function |
|-------|-----------|---------|---------------|
| Booking confirmation | Guest | Sign-up or manual add | `create-booking` (primary) or `send-booking-email` (legacy) |
| Booking cancellation (guest) | Guest | Cancel via token link | `cancel-booking` → `send-booking-email` |
| Booking cancellation (producer) | Producer | Cancel via token link | `cancel-booking` → `send-booking-email` |
| New booking notification | Producer | New sign-up (immediate frequency) | `create-booking` or `send-booking-email` |
| Mic goes live | Producer | Event published | `send-mic-goes-live-email` |
| Daily digest | Producer | Cron (daily) | `send-daily-notifications` → `send-producer-notifications` |
| Weekly digest | Producer | Cron (weekly) | `send-weekly-notifications` → `send-producer-notifications` |
| Monthly digest | Producer | Cron (monthly) | `send-monthly-notifications` → `send-producer-notifications` |
| Auth emails (signup, recovery, etc.) | User | Supabase Auth events | `auth-email-hook` |

### Stub Mode
When `STUB_EMAILS=true`, all Edge Functions log the email payload to the console instead of calling Zeptomail. This is useful for development and when Zeptomail credits are exhausted.

### Message Logging
Every email attempt is logged to the `message_logs` table with:
- `booking_id` (if applicable)
- `producer_id`
- `email_address`
- `message_type` (e.g., `booking_confirmation_guest`, `booking_cancellation_producer`, `mic_goes_live`)
- `subject`
- `delivery_status` (`sent`, `failed`, `stubbed`)
- `error_message` (if failed)
