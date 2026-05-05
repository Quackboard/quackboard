# QuackBoard — Frontend Component Breakdown

## 1. Route Map

All routes are defined in `src/App.tsx`. The app uses React Router DOM v6 with a flat route structure.

### Public Routes (no authentication required)

| Path | Page Component | Description |
|------|---------------|-------------|
| `/` | `Index` | Landing / marketing page |
| `/producer/:slug` | `ProducerPage` | Public producer page — comics browse events and sign up for spots |
| `/login` | `Login` | Email/password login |
| `/signup` | `Signup` | New account registration |
| `/auth/callback` | `AuthCallback` | OAuth/magic-link callback handler |
| `/cancel/:token` | `CancelBooking` | Booking cancellation via unique token link |
| `/embed/:slug` | `EmbedWidgetPage` | Embeddable calendar widget (for iframes on external sites) |
| `/preview/embed/:slug` | `EmbedPreviewPage` | Preview of the embed widget |
| `/privacy` | `PrivacyPolicy` | Privacy policy page |
| `/terms` | `TermsOfService` | Terms of service page |
| `/email-preview` | `EmailPreview` | Email template preview (development tool) |
| `/browse` | `DiscoverMics` | Public directory of open mics |
| `/admin` | `Admin` | Admin panel (no ProtectedRoute wrapper — likely relies on internal checks) |
| `*` | `NotFound` | 404 catch-all |

### Protected Routes (requires authentication + onboarding)

All wrapped in `<ProtectedRoute>` which checks for: (1) valid session, (2) completed onboarding (producer has a `slug`).

| Path | Page Component | Description |
|------|---------------|-------------|
| `/onboarding` | `Onboarding` | New user setup — set name, slug, venue |
| `/dashboard` | `Dashboard` | Main producer dashboard — list/calendar view of events |
| `/create` | `CreateMic` | Create a new open mic event |
| `/events/:id/edit` | `EditMic` | Edit an existing event |
| `/events/:id/duplicate` | `DuplicateMic` | Duplicate an event as a new draft |
| `/events/:id/lineup` | `EventLineup` | View and manage the lineup for an event |
| `/edit-profile` | `EditProfile` | Edit producer profile (name, slug, bio, venue, timezone) |

---

## 2. Provider Tree

```
QueryClientProvider (TanStack React Query)
  └── TooltipProvider (Radix)
        ├── Toaster (shadcn toast)
        ├── Sonner (sonner toast)
        ├── FeedbackButton (global floating button)
        └── BrowserRouter
              └── AuthProvider (Supabase auth context)
                    └── Routes (all pages)
```

Key points:
- `QueryClientProvider` is the outermost provider so all pages share a single cache.
- `AuthProvider` is inside `BrowserRouter` because it uses `useNavigate` internally.
- Two toast systems coexist: shadcn's `Toaster` and `Sonner` — used in different parts of the app.

---

## 3. Page Components

### ProducerPage (`src/pages/ProducerPage.tsx`)
The public-facing page where comics interact with events. It:
- Resolves the producer by slug or UUID (backward compatibility — redirects UUID URLs to slug URLs).
- Fetches published events and bookings via React Query.
- Subscribes to **Supabase Realtime** for live booking updates (new bookings appear instantly).
- Filters events by the producer's `event_window_days` setting.
- Renders `ProducerHeader` → `DaySelector` → `EventCard` for each event on the selected date.

### Dashboard (`src/pages/Dashboard.tsx`)
The authenticated producer's home. It:
- Supports two view modes: **List** (upcoming/past tabs) and **Calendar** (by event date / created date).
- Shows event counts, booking fill rates, and quick actions (edit, duplicate, view lineup).
- Includes a collapsible "Share & Embed" section with the public page URL and embed code.

### CreateMic (`src/pages/CreateMic.tsx`)
Complex form for event creation with:
- Zod schema validation via `react-hook-form`.
- Dynamic section management (add/remove sections with labels, slot counts, types).
- Wildcard section support (with `signup_opens_at_days_before` and `signup_opens_at_time`).
- Recurrence support via `RecurrenceSelector` (weekly, biweekly, monthly with end date).
- Form draft persistence via `useFormDraft` (saves to localStorage, restores on page load).
- Publish options: immediate ("live") or scheduled (`signupDaysBefore` + time).
- Email frequency selector (none, immediate, daily).

### EventLineup (`src/pages/EventLineup.tsx`)
Lineup management for a specific event:
- Table view of all sections and slots with booking details.
- `AddToSlotModal` for producers to manually add someone to an empty slot.
- `RemoveFromLineupModal` for removing a booking (soft delete via `cancelled_at`).
- `ExportCsvModal` for downloading the lineup as CSV.
- Wildcard section handling: before cutoff, wildcard slots are hidden; after cutoff, they appear dynamically.

### CancelBooking (`src/pages/CancelBooking.tsx`)
Token-based public page for guests:
- Fetches booking by `cancel_token` via Supabase query.
- Calls the `cancel-booking` Edge Function to cancel.
- Also shows alert frequency preferences (stored in localStorage).

---

## 4. Component Hierarchy

### Producer Components (`src/components/producer/`)

| Component | Purpose |
|-----------|---------|
| `ProducerHeader` | Displays producer name, bio, venue info, social links |
| `DaySelector` | Horizontal date picker for filtering events by day |
| `EventCard` | Card for a single event showing time, venue, and `SpotList` |
| `SpotList` | Renders all sections and slots; handles wildcard countdown timer and sign-up buttons |
| `SignUpModal` | Dialog for a comic to claim a spot (name, email, optional Instagram) |
| `CancelSpotModal` | Confirmation dialog before canceling a spot from the public page |
| `BulkCreateMic` | Bulk event creation interface |

### Lineup Components (`src/components/lineup/`)

| Component | Purpose |
|-----------|---------|
| `AddToSlotModal` | Producer manually adds a comic to an empty slot (sends email via `createBooking`) |
| `RemoveFromLineupModal` | Confirmation before removing a comic from the lineup |
| `ExportCsvModal` | Export lineup data as CSV |

### Dashboard Components (`src/components/dashboard/`)

| Component | Purpose |
|-----------|---------|
| `CalendarDashboard` | Month grid calendar view of events |
| `EventRow` | Single event row in the list view with fill rate badge |
| `EventDetailDialog` | Detail overlay for an event |

### Embed Components (`src/components/embed/`)

| Component | Purpose |
|-----------|---------|
| `CalendarWidget` | Embeddable calendar that shows upcoming events for a producer |
| `EmbedSection` | UI in the dashboard for generating and copying embed code |

### Layout Components (`src/components/layouts/`)

| Component | Purpose |
|-----------|---------|
| `ProducerLayout` | Shell with top nav (`Navbar`), responsive sidebar, and content area |

### Global Components

| Component | Purpose |
|-----------|---------|
| `Navbar` | Top navigation bar with logo, nav links, and user menu |
| `NavLink` | Active-aware navigation link |
| `ProtectedRoute` | Auth guard + onboarding check |
| `FeedbackButton` | Floating feedback button (global) |

### UI Primitives (`src/components/ui/`)

~40 shadcn/ui components built on Radix primitives. Notable custom additions:
- `MarkdownEditor` — textarea with markdown preview toggle
- `RecurrenceSelector` — recurrence pattern picker (weekly/biweekly/monthly + end date)
- `password-input` — password field with show/hide toggle

---

## 5. Custom Hooks

| Hook | File | Purpose |
|------|------|---------|
| `useAuth` | `src/contexts/AuthContext.tsx` | Access `user`, `session`, `loading`, `signOut` from the auth context |
| `useProducerFeatures` | `src/hooks/useProducerFeatures.ts` | Fetch feature flags from `producer_features` table; exposes `hasFeature(name)` |
| `useProducerSlug` | `src/hooks/useProducerSlug.ts` | Fetch the current producer's slug for URL generation |
| `useFormDraft` | `src/hooks/useFormDraft.ts` | Auto-save/restore `react-hook-form` state to localStorage |
| `useIsMobile` | `src/hooks/use-mobile.tsx` | Responsive breakpoint detection |
| `useToast` | `src/hooks/use-toast.ts` | Shadcn toast hook |

---

## 6. State Management Strategy

QuackBoard uses a **no global store** approach. State is split across:

| State Type | Mechanism | Examples |
|-----------|-----------|---------|
| **Server state** | TanStack React Query | Events, bookings, producer profile, features |
| **Auth state** | React Context (`AuthContext`) | Current user, session, loading flag |
| **Form state** | react-hook-form + zod | CreateMic, EditMic, SignUpModal forms |
| **UI state** | React `useState` | Modal open/close, selected date, view mode, expanded sections |
| **Persisted preferences** | localStorage | Form drafts (`useFormDraft`), alert frequency preferences |
| **Real-time state** | Supabase Realtime channels | Booking changes on `ProducerPage` (live slot updates) |

### Query Key Patterns

```typescript
['producer', slug]                    // Single producer by slug
['producer-events', producerId]       // Events for a producer
['event-bookings', eventIds]          // Bookings for a set of events
['producer-all-events', userId]       // All events (calendar view)
['producer-events', userId, viewType] // Events filtered by upcoming/past
['event-lineup', eventId]             // Single event for lineup page
['producer-features', userId]         // Feature flags
['producer-profile', userId]          // Producer profile data
['booking-by-token', token]           // Single booking by cancel token
```

### Invalidation

- After a booking is created or canceled, queries are invalidated via `queryClient.invalidateQueries()`.
- Realtime subscriptions on `ProducerPage` call `refetchBookings()` when postgres change events arrive, keeping the public page in sync without polling.

---

## 7. Utility Modules (`src/lib/`)

| Module | Exports | Purpose |
|--------|---------|---------|
| `email.ts` | `sendBookingConfirmationEmail`, `sendCancellationEmail`, `sendMicGoesLiveEmail`, `createBooking` | Frontend wrappers that invoke Supabase Edge Functions with retry logic |
| `slug.ts` | `generateSlug`, `validateSlug`, `isUUID`, `RESERVED_SLUGS` | Slug generation, validation, and UUID detection |
| `producer-notifications.ts` | `sendProducerNotifications`, `triggerDailyNotifications`, `triggerWeeklyNotifications`, `triggerMonthlyNotifications` | Wrappers for notification Edge Functions |
| `utils.ts` | `cn` | Tailwind class name merging (clsx + tailwind-merge) |
