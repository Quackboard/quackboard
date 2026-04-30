# QuackBoard iOS App — Native SwiftUI Strategy & Implementation Plan

## Problem Statement

Build a native iOS app in Swift/SwiftUI that uses the existing Supabase backend and Edge Functions while matching the web app’s design language.

## Current State

**Backend (reusable as-is):** QuackBoard already exposes Supabase Auth, direct PostgREST reads/writes, Realtime subscriptions, and 11 Edge Functions including `create-booking`, `cancel-booking`, `send-booking-email`, and `get-producer-events-embed`. Supabase’s Swift SDK supports Auth, PostgREST, Realtime, and Edge Function invocation, so the backend contracts can stay unchanged.

**Web app:** React 18 + TypeScript + Tailwind + shadcn/ui at the repository root, with the current visual system defined primarily in `src/index.css` and `tailwind.config.ts`.

**Design language:** Teal primary actions, cool gray backgrounds, Outfit headings, 1rem/16px rounded cards, status colors for live/upcoming/past/draft, and card-based layouts.

**Repo state:** Some earlier React Native-oriented scaffolding was added (`apps/web/`, `apps/mobile/`, `packages/shared`, root npm workspace). For the native Swift path, that extra structure should be removed and the repo returned to a simpler layout with the web app at the root and a native iOS project added separately.

## Recommended Approach: SwiftUI + supabase-swift

### Why SwiftUI

- Native iOS navigation, sheets, haptics, deep linking, and input controls will feel more natural than a cross-platform layer.
- `supabase-swift` can handle the same auth, database, realtime, and Edge Function flows the web app already uses.
- The backend security model does not change: anon/publishable client key in-app, JWT-backed auth, RLS for direct table access, and service-role-only work kept inside Edge Functions.

### Trade-offs

- Unlike the React Native path, UI code and most client-side business logic will not be shared with the web app.
- Reuse should focus on API contracts, copy/content, and a platform-neutral design-token source rather than TypeScript modules.

## Proposed Changes

### Phase 1: Simplify the repo and pivot to native iOS

1. Revert the earlier web-app move and keep the web codebase at the repository root.
2. Remove the Expo/React Native scaffold and JS workspace pieces that were added for the cross-platform path.
3. Add a native iOS project under `ios/` (Xcode project + SwiftUI app target).
4. Keep `supabase/` as the existing backend source of truth.

### Phase 2: Native iOS foundation

1. Create a SwiftUI app target.
2. Add `supabase-swift` with Swift Package Manager.
3. Create a single `SupabaseClient` configured with the existing project URL and anon key.
4. Persist auth session natively and model current backend contracts with Swift `Codable` types for producers, events, bookings, sections, and Edge Function payloads.

### Phase 3: Map existing QuackBoard flows to SwiftUI

**Comic-facing flows:**
1. Discover mics
2. Producer page with event/day selection
3. Sign-up flow invoking `create-booking`
4. Cancel-booking deep link invoking `cancel-booking`
5. Realtime slot updates on producer/event screens

**Producer-facing flows:**
6. Login/signup
7. Dashboard
8. Event lineup
9. Create/edit mic
10. Edit profile

### Phase 4: Shared design language across web and iOS

1. Extract platform-neutral tokens from the current web design system into a source file that can drive both platforms.
2. Keep web consuming CSS/Tailwind tokens.
3. Generate or hand-maintain matching Swift color, typography, spacing, and radius constants for iOS.
4. Match visual identity while using native interaction patterns such as `NavigationStack`, `TabView`, `sheet`, native date pickers, swipe actions, and haptics.

### Phase 5: Delivery order

1. App shell + theme + Supabase client
2. Auth
3. Comic-facing read-only screens
4. Booking + cancellation flows
5. Producer dashboard + lineup
6. Create/edit mic
7. Native enhancements such as push notifications, share sheet, and richer deep links

## Immediate next step if approved

Revert the repo to the simpler root-based web layout, remove the Expo scaffold, create a native SwiftUI app skeleton in `ios/`, and wire Supabase auth plus the first producer/event read flows.
