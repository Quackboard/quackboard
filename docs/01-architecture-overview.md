# QuackBoard — Architecture Overview

## 1. What Is QuackBoard?

QuackBoard is a web-based open mic management platform designed for **comedy producers**. It solves two problems:

1. **For producers:** Create open mic events, define spot sections, track sign-ups in real time, manage lineups, and receive booking notifications — all from a single dashboard.
2. **For comedians (comics):** Browse a producer's public page, claim a spot with one click, receive a confirmation email, and cancel via a secure link if plans change.

The app is built with the [Lovable](https://lovable.dev) platform and uses Supabase as its backend-as-a-service.

---

## 2. High-Level Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                        Browser (SPA)                             │
│  React 18 · Vite · TypeScript · Tailwind CSS · shadcn/ui        │
│  React Router DOM v6 · TanStack React Query                     │
└──────────────┬───────────────────────────────┬───────────────────┘
               │  supabase-js client           │  supabase.functions.invoke()
               ▼                               ▼
┌──────────────────────────┐   ┌──────────────────────────────────┐
│   Supabase PostgreSQL    │   │   Supabase Edge Functions (Deno) │
│   + Auth + Realtime      │   │                                  │
│   + Row Level Security   │   │   create-booking                 │
│                          │   │   send-booking-email              │
│   Tables:                │   │   cancel-booking                  │
│   - producers            │   │   cancel-booking-by-email         │
│   - events               │   │   get-producer-events-embed       │
│   - bookings             │   │   send-mic-goes-live-email        │
│   - event_templates      │   │   send-producer-notifications     │
│   - comic_profiles       │   │   send-daily-notifications        │
│   - message_logs         │   │   send-weekly-notifications       │
│   - message_templates    │   │   send-monthly-notifications      │
│   - scheduled_messages   │   │   auth-email-hook                 │
│   - beta_access_codes    │   │                                  │
│   - producer_features    │   └───────────────┬──────────────────┘
└──────────────────────────┘                   │
                                               ▼
                                  ┌─────────────────────────┐
                                  │  Zeptomail (SMTP API)   │
                                  │  Transactional email    │
                                  └─────────────────────────┘
```

### Data Flow Summary

| Action | Flow |
|--------|------|
| Read data (events, bookings, producer profile) | Browser → `supabase-js` → PostgreSQL (via RLS) |
| Real-time booking updates on public pages | Supabase Realtime (Postgres changes channel) |
| Create a booking (atomic) | Browser → Edge Function `create-booking` → INSERT + Zeptomail |
| Cancel a booking | Browser → Edge Function `cancel-booking` → UPDATE + email via `send-booking-email` |
| Scheduled notification digests | Cron → `send-daily/weekly/monthly-notifications` → `send-producer-notifications` → Zeptomail |
| Embed widget data | External site → Edge Function `get-producer-events-embed` → JSON response |

---

## 3. Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend framework** | React 18 | Component-based UI |
| **Build tool** | Vite 5 | Fast HMR and production bundling |
| **Language** | TypeScript 5.8 | Static typing |
| **Styling** | Tailwind CSS 3.4 + tailwindcss-animate | Utility-first styling |
| **Component library** | shadcn/ui (Radix primitives) | Accessible UI primitives |
| **Routing** | React Router DOM v6 | Client-side routing |
| **Server state** | TanStack React Query v5 | Caching, invalidation, background refetch |
| **Form handling** | react-hook-form + zod | Schema-validated forms |
| **Backend** | Supabase (PostgreSQL 15+) | Database, auth, realtime, edge functions |
| **Edge runtime** | Deno (Supabase Edge Functions) | Server-side logic |
| **Email** | Zeptomail (Zoho) | Transactional email delivery |
| **Deployment** | Lovable platform | Hosting and CI |

---

## 4. Authentication

Authentication is handled entirely by **Supabase Auth** using email/password.

### Flow

1. User signs up at `/signup` → Supabase creates a `auth.users` row.
2. A PostgreSQL trigger (`handle_new_user()`) auto-creates a `producers` record linked to the user's `auth.uid`.
3. The `AuthContext` (`src/contexts/AuthContext.tsx`) subscribes to `onAuthStateChange` and exposes `user`, `session`, `loading`, and `signOut`.
4. `ProtectedRoute` (`src/components/ProtectedRoute.tsx`) wraps all authenticated pages. It:
   - Redirects unauthenticated users to `/login`.
   - Checks if the user has completed onboarding (has a `slug`); if not, redirects to `/onboarding`.
5. Custom auth email templates are handled by the `auth-email-hook` Edge Function with branded HTML for signup confirmation, password recovery, magic link, etc.

### Session Handling

- `supabase.auth.getSession()` is called on mount.
- `onAuthStateChange` keeps the React state in sync with token refreshes.
- The `supabase-js` client automatically attaches the JWT to every request, which PostgreSQL RLS policies use for authorization.

---

## 5. Database Schema

All tables live in the `public` schema. Types are auto-generated into `src/integrations/supabase/types.ts`.

### Core Tables

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `producers` | User profiles (1:1 with `auth.users`) | `id` (= auth uid), `email`, `name`, `slug`, `venue_name`, `venue_address`, `bio_markdown`, `timezone`, `event_window_days` |
| `events` | Open mic events | `id`, `producer_id` (FK → producers), `title`, `date`, `start_time`, `end_time`, `venue_name`, `venue_address`, `sections_config` (JSONB), `status`, `publish_at`, `signup_opens_at`, `email_frequency`, `producer_message`, `allow_multiple_slots` |
| `bookings` | Spot reservations | `id`, `event_id` (FK → events), `slot_position`, `guest_name`, `guest_email`, `guest_instagram`, `cancel_token` (UUID), `cancelled_at`, `comic_profile_id` |
| `event_templates` | Recurring event templates | `series_id`, `recurrence_pattern`, `recurrence_day`, `sections_config`, `producer_id` |
| `comic_profiles` | Comedian profiles | `id`, `email`, `name`, `instagram`, `subscription_tier` |
| `producer_features` | Feature flags per producer | `id`, `producer_id`, `feature`, `granted_at` |

### Supporting Tables

| Table | Purpose |
|-------|---------|
| `message_logs` | Audit trail of every email sent (booking confirmations, cancellations, producer notifications) |
| `message_templates` | Reusable email templates |
| `scheduled_messages` | Email scheduling records |
| `beta_access_codes` | Beta invitation codes with usage limits and expiry |

### Key Relationships

```
producers  1 ──── * events
events     1 ──── * bookings
producers  1 ──── * event_templates
producers  1 ──── * producer_features
bookings   * ──── 1 comic_profiles (optional)
```

### Sections Config (JSONB)

Events store their spot layout as a JSONB array in `sections_config`:

```json
[
  { "label": "First Timers", "slots": 5, "type": "regular" },
  { "label": "Regulars", "slots": 10, "type": "regular" },
  { "label": "Wildcards", "slots": 3, "type": "wildcard", "signup_opens_at": "2026-03-28T18:00:00Z", "signup_opens_at_days_before": 0, "signup_opens_at_time": "18:00" }
]
```

---

## 6. Row Level Security (RLS)

All tables have RLS enabled. The general policy pattern:

| Table | SELECT | INSERT/UPDATE/DELETE |
|-------|--------|----------------------|
| `producers` | Own record only (`auth.uid() = id`) | Own record only |
| `events` | Published events are public; own events for authenticated producers | Own events only |
| `bookings` | Public for published events (guests need to see spots); producers can see their event bookings | Insert: public (anyone can book); Update/Delete: own event bookings or via cancel token |
| `event_templates` | Own templates only | Own templates only |
| `message_logs` | Own logs only | Own logs only |
| `producer_features` | Own features only | Admin only |

Edge Functions that need to bypass RLS (e.g., `create-booking`, `cancel-booking`) use the **service role key**, which is only available server-side.

---

## 7. Project Structure

```
quackboard-ultra-lean/
├── docs/                  # This documentation
├── public/                # Static assets (favicon, etc.)
├── src/
│   ├── assets/            # Logo images
│   ├── components/
│   │   ├── ui/            # shadcn/ui primitives (~40 components)
│   │   ├── producer/      # Producer page components (EventCard, SpotList, SignUpModal, etc.)
│   │   ├── lineup/        # Lineup management (AddToSlotModal, RemoveFromLineupModal, ExportCsvModal)
│   │   ├── dashboard/     # Dashboard components (CalendarDashboard, EventRow, EventDetailDialog)
│   │   ├── embed/         # Embeddable widget (CalendarWidget, EmbedSection)
│   │   ├── discover/      # Browse/discover page (ListMicSheet)
│   │   └── layouts/       # ProducerLayout (sidebar + nav shell)
│   ├── contexts/          # AuthContext
│   ├── hooks/             # useAuth, useProducerFeatures, useProducerSlug, useFormDraft, use-mobile
│   ├── integrations/
│   │   └── supabase/      # Supabase client + auto-generated types
│   ├── lib/               # Utility modules (email.ts, slug.ts, producer-notifications.ts, utils.ts)
│   ├── pages/             # Route-level components (~18 pages)
│   └── types/             # Hand-written TS interfaces (database.ts)
├── supabase/
│   ├── config.toml        # Supabase project config
│   ├── functions/         # Edge Functions (Deno)
│   │   ├── _shared/       # Shared email templates for auth hooks
│   │   ├── create-booking/
│   │   ├── send-booking-email/
│   │   ├── cancel-booking/
│   │   ├── cancel-booking-by-email/
│   │   ├── get-producer-events-embed/
│   │   ├── send-mic-goes-live-email/
│   │   ├── send-producer-notifications/
│   │   ├── send-daily-notifications/
│   │   ├── send-weekly-notifications/
│   │   ├── send-monthly-notifications/
│   │   └── auth-email-hook/
│   └── migrations/        # SQL migration files (read-only after creation)
├── package.json
├── vite.config.ts
├── tailwind.config.ts
└── tsconfig.json
```
