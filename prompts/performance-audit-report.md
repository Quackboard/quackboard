# QuackBoard Performance Audit & Remediation Plan

**Audience:** App owner / engineering
**Scope:** Performance only (security covered separately in `remediation-priorities.md`)
**Method:** Static code review of `main` and the `feat/bug-fix` branch (commit `7b395c0` — "fix: performance optimizations for dashboard and account pages") + cross-reference against an external audit (Claude Code) and the app owner's status report. Effort estimates assume one mid-level engineer familiar with the stack.
**Last reconciled:** 2026-04-30 against `origin/feat/bug-fix@7b395c0` and the owner's status notes.

---

## TL;DR

- The owner's "the app is very slow" complaint is **explained by a small set of front-end data-fetching and bundling issues**, not by infrastructure or backend cold-starts.
- An external audit (Claude Code) flagged 10 issues. After reconciliation: **2 already in `main`, 3 fixed on `feat/bug-fix` (not yet merged), 1 partially fixed on the branch, 4 still outstanding** — including the two highest-impact items.
- **Merging `feat/bug-fix` is the single highest-leverage action available right now** — it closes 3 items in production for free.
- After the merge, fixing the top remaining items (`C1`, `C2`, `C4`) is **~2–3 dev-days** and should produce a step-change improvement in perceived speed.
- Total effort to clear the P0 + P1 backlog: **~4–6 dev-days** (down from the original ~5–7 because the branch already covers part of it).

---

## 1. Findings — Reconciled status of every item from the external audit

Legend: ✅ in `main` · 🟢 fixed on `feat/bug-fix` (not yet merged) · 🟡 partial · 🔴 outstanding

| # | Finding | Page | External severity | Status | Where it lives |
|---|---|---|---|---|---|
| 1 | 3 sequential DB round-trips | `/:slug` | Very High | 🔴 **Outstanding (helper written)** | Helper `src/lib/fetchAccountPageData.ts` exists on `feat/bug-fix` (batches into 2 RTTs via `Promise.all` + embedded bookings) with tests, but **not yet wired into `AccountPage.tsx`**. |
| 2 | Giant single JS bundle | Both | High | 🔴 **Outstanding** | `src/App.tsx` still static-imports all 24 pages on both `main` and `feat/bug-fix`. No `React.lazy` yet. |
| 3 | Events fetch brings all booking rows | Dashboard | High | 🟢 **Fixed on `feat/bug-fix`** | New constants `DASHBOARD_EVENT_COLUMNS` (no embedded bookings, used for upcoming + calendar) and `DASHBOARD_PAST_EVENT_COLUMNS` (embedded bookings only where `EventRow` needs them). Just merge the branch. |
| 4 | Auth → profile → dashboard waterfall | Dashboard | High | 🔴 **Outstanding** | Branch did not touch `ProtectedRoute.tsx`. Still does its own uncached `producers.slug` query, blocking the dashboard mount. |
| 5 | Hidden calendar widget fetching silently | Dashboard | Medium-High | ✅ **In `main`** | `Dashboard.tsx:77` — `allEvents` is gated by `enabled: viewMode === 'calendar'`. |
| 6 | Full re-download on every realtime update | `/:slug` | Medium | 🔴 **Outstanding** | Branch removed neither `refetchInterval: 10_000` (`AccountPage.tsx:112`) nor the `invalidateQueries` realtime callback. |
| 7 | `SELECT *` on Account Page events | `/:slug` | Medium | 🟢 **Mostly fixed on `feat/bug-fix`** | Constant `ACCOUNT_PAGE_EVENT_COLUMNS` defined and used on the branch. **Caveat:** `fetchAccountPageData.ts` still uses `select("*")` for the `accounts` and `producers` tables — worth narrowing as a tiny follow-up. |
| 8 | Tab-switching always re-fetches | Dashboard | Medium | 🟢 **Fixed on `feat/bug-fix`** | New `createQueryClient` (`src/lib/queryClientConfig.ts`) sets `staleTime: 60_000`. **Caveat:** does **not** set `refetchOnWindowFocus: false` or `retry: 1` — focus-refetches still fire but no-op within the 1-min window. Recommend adding both for completeness. |
| 9 | Per-second timers × every event card | `/:slug` | Medium | 🟡 **Partially mitigated (architectural fix still needed)** | `EventCard.tsx:64–126` smart-gates timers to within 5 min of `signup_opens_at` and uses one-shot `setTimeout` outside that window. **However:** with N events all in their open window, you still get N independent `setInterval`s plus N re-renders/sec. The owner's recommendation — hoist a single timer to the parent and prop-drill `now` to memoized cards — is correct. _(Earlier draft of this report rated this "Resolved"; corrected after re-evaluation.)_ |
| 10 | Producer profile fetched twice | Dashboard | Medium | 🔴 **Outstanding** | `ProtectedRoute` still bypasses React Query cache; `useProducerSlug` reads `producers` separately. Same fix as #4. |

**Reconciled score:** 1 ✅ in `main` · 3 🟢 fixed on `feat/bug-fix` · 1 🟡 partial · 5 🔴 outstanding.

**Recommended first action:** merge `feat/bug-fix` into `main`. That alone moves 3 high/medium items from 🔴 to ✅ in production.

---

## 2. Root-cause analysis (why the app feels slow)

### Cause A — Sequential request waterfall on `/:slug` (public producer page)
**Where:** `src/pages/AccountPage.tsx:49–113`

**Sequence on first paint:**
```text
t=0ms     fetch /accounts          (uses :slug)
t=~150ms  fetch /producers         (uses :slug)            ← could have run in parallel with /accounts
t=~300ms  fetch /events            (uses producer.id)      ← must wait for /producers
t=~450ms  fetch /bookings          (uses event_ids)        ← must wait for /events
t=~600ms  first useful render
```

**Compounding factor:** every query is `select('*')`, multiplying payload size 3–10×.

**Why it matters:** `/:slug` is the public sign-up page — the most performance-sensitive surface in the app. A 3× round-trip latency directly translates to comics abandoning sign-ups.

### Cause B — Bundle bloat (entire app loads as one file)
**Where:** `src/App.tsx:8–32`

The 25 page components plus Radix UI (~200 KB), recharts (~400 KB), and react-markdown (~150 KB) are all shipped on first byte. A user landing on `/login` still pays for `/admin`, `/email-preview`, `/embed`, `/edit-mic`, etc.

### Cause C — Realtime + 10-second polling fight each other on `/:slug`
**Where:** `src/pages/AccountPage.tsx:112` (`refetchInterval: 10_000`) **and** `:120–137` (postgres realtime subscription)

Both mechanisms re-fetch all bookings for all displayed events on every change. The realtime handler uses `invalidateQueries` instead of patching the cache, which forces a full network round-trip and re-renders every `EventCard` / `SpotList`.

### Cause D — No global React Query defaults
**Where:** `src/App.tsx:34` — `const queryClient = new QueryClient();`

With no `staleTime`, queries are stale immediately after fetch. With default `refetchOnWindowFocus: true`, every tab switch refetches everything. This explains the audit's "tab-switching always re-fetches" finding.

### Cause E — Auth + profile waterfall before any protected page paints
**Where:** `src/contexts/AuthContext.tsx:20–38`, `src/components/ProtectedRoute.tsx:17–44`

`AuthProvider.getSession()` (1 RTT) → `ProtectedRoute` slug query (2nd RTT) → page mounts and fires its own queries (3rd+ RTT). The slug query in `ProtectedRoute` is **not** the cached `useProducerSlug` hook — it's a separate, uncached call.

### Cause F — Dashboard double-fetches bookings
**Where:** `src/pages/Dashboard.tsx:67–72, 90–94, 110–114, 140–151`

The list-view events query embeds `bookings(id, slot_position, cancelled_at)`, even though a separate `event_availability` view query already provides the booked counts the list view needs. Embedded bookings should only load when a row is expanded.

---

## 3. Re-prioritized backlog (post-reconciliation)

| Priority | ID | Task | Status | Pages | Effort |
|---|---|---|---|---|---|
| 🔴 P0 | M0 | **Merge `feat/bug-fix` into `main`** — closes #3, #7 (events portion), #8 in production | New (recommended first action) | All | <0.25 d (review) |
| 🔴 P0 | C5b | Tiny tweaks to fold into the M0 PR if possible: narrow `accounts`/`producers` `select("*")` in `fetchAccountPageData.ts`; add `refetchOnWindowFocus: false` + `retry: 1` in `queryClientConfig.ts` | New | `/:slug`, all | <0.25 d |
| 🔴 P0 | C1 | Wire `fetchAccountPageData` into `AccountPage.tsx`; replace 4 `useQuery` hooks with one; update realtime subscription to invalidate the new key | Helper exists on branch | `/:slug` | 0.5 d |
| 🔴 P0 | C2 | Route-level code splitting (`React.lazy`) + Vite `manualChunks` | Outstanding | All | 1–1.5 d |
| 🟠 P1 | C4a | Drop the line `refetchInterval: 10_000` in `AccountPage.tsx:112` (realtime already covers it) | Outstanding | `/:slug` | <0.1 d |
| 🟠 P1 | C6 | Replace `ProtectedRoute`'s inline `producers.slug` query with the cached `useProducerSlug` hook — fixes #4 and #10 in one change | Outstanding | All protected | 0.5 d |
| 🟠 P1 | C7 | Hoist a single shared timer to the parent of `EventCard`; prop-drill `now`; `React.memo` cards (#9 architectural fix) | Outstanding | `/:slug` | 0.5 d |
| 🟠 P1 | C4b | Convert realtime handler to `setQueryData` patches (after C1 lands so the new key is the target) | Outstanding | `/:slug` | 0.5–1 d |
| 🟡 P2 | C9 | Add `web-vitals` reporter + a query-count overlay to verify gains in production | Outstanding | All | 0.5 d |
| 🟡 P2 | C8 | Audit remaining `SELECT *` not covered by C5b | Outstanding | Various | 0.25 d |

**Note:** Items `C3`, `C5`, `C10` from the previous version are absorbed:
- C3 (`QueryClient` defaults) → partly delivered by `feat/bug-fix`; remainder folded into **C5b**.
- C5 (Dashboard embedded bookings) → delivered by `feat/bug-fix` (`DASHBOARD_EVENT_COLUMNS`).
- C10 (de-dup producer reads) → same fix as **C6** (cache-driven `ProtectedRoute`).

**Total estimated effort (after merging `feat/bug-fix`):**
- P0 only: **~2–2.5 dev-days**
- P0 + P1: **~4–6 dev-days**
- Full backlog: **~5–6.5 dev-days**

---

## 3a. Recommended execution order (post-reconciliation)

**Guiding principle:** *Land already-built fixes first, ship low-risk follow-ups next, tackle the highest-impact-but-highest-risk change last — with measurement at the start and end.*

### Phase 0 — Land what's already built · ~0.5 d
| Step | Task | Why first |
|---|---|---|
| 1 | **M0** — Review and merge `feat/bug-fix` (commit `7b395c0`) into `main` | Closes #3, #7 (events), #8 with zero new code. Biggest reward-per-effort move available. |
| 2 | **C5b** — In the same PR (or as a tiny follow-up): narrow `select("*")` on `accounts`/`producers` in `fetchAccountPageData.ts`; add `refetchOnWindowFocus: false` + `retry: 1` in `queryClientConfig.ts` | Closes the residual caveats on #7 and #8 in one shot. |
| 3 | **C9** — Add `web-vitals` reporter + a tiny query-count debug overlay (dev-only); capture baseline Lighthouse / Network screenshots on `/:slug` and `/dashboard` | Without measurement, every later change is guesswork. |

### Phase 1 — Quick, low-risk wins · ~0.5 d
| Step | Task | Why here |
|---|---|---|
| 4 | **C4a** — Delete the line `refetchInterval: 10_000` in `AccountPage.tsx:112` | One-line change; realtime already covers it. Immediately halves request volume on `/:slug`. |
| 5 | **C6** — Make `ProtectedRoute` reuse the cached `useProducerSlug` instead of its own query | Single change closes both #4 (auth waterfall) and #10 (duplicate producer fetch). |

### Phase 2 — The biggest user-visible win · ~0.5–1 d
| Step | Task |
|---|---|
| 6 | **C1** — Wire `fetchAccountPageData` into `AccountPage.tsx`: replace the 4 `useQuery` hooks with one; update the realtime subscription to invalidate the new key |

This is the main payoff for `/:slug`. The helper and tests already exist on `feat/bug-fix`, so the risk is mostly in the integration, not the algorithm.

### Phase 3 — Architectural cleanups · ~1 d
| Step | Task |
|---|---|
| 7 | **C7** — Hoist a single shared timer (e.g. a `useNow()` hook) to the parent of `EventCard`; prop-drill `now`; `React.memo` cards. Resolves #9 architecturally. |
| 8 | **C4b** — Convert the realtime `invalidateQueries` to `setQueryData` patches (now targeting the unified key from C1). |

### Phase 4 — Bundle splitting · ~1–1.5 d
| Step | Task |
|---|---|
| 9 | **C2** — Route-level `React.lazy` + `<Suspense>` + Vite `manualChunks` |

Deliberately last because:
- It changes loading behavior on every route (needs `<Suspense fallback>` + ideally an error boundary).
- It dramatically changes bundle output — easy to introduce subtle regressions.
- It deserves a clean before/after Lighthouse comparison — which Phase 0 instrumentation enables.

### Phase 5 — Verify & report · ~0.5 d
- Re-run Phase 0 measurements; produce a before/after delta for the owner.
- Decide whether to start on the security backlog (`remediation-priorities.md`) or P2 polish next.

### When to deviate
- **Need a visible win this week:** Phase 0 (just M0 + C5b) ships in <0.5 d and immediately closes 3 items in production.
- **Two engineers available:** Engineer A: M0 → C9 → C2 (frontend track). Engineer B: C4a → C6 → C1 → C4b (data-layer track). Sync at Phase 5.
- **User reports point at booking submit specifically (not list pages):** this perf list won't fix it; address the **outbox pattern** for booking emails (covered in `remediation-priorities.md`).

### Anti-patterns to avoid
- ❌ **Don't merge `feat/bug-fix` and start C1/C2 in the same PR.** You'll lose the ability to attribute regressions or wins.
- ❌ **Don't skip Phase 0.** "Is the app slow?" deserves a number, not a vibe.
- ❌ **Don't refactor heavy components (`MarkdownEditor`, `CalendarDashboard`) speculatively.** Wait for `web-vitals` data to point at them.
- ❌ **Don't ship C1 and C2 in the same week.** Both materially change `/:slug` performance characteristics; you want to be able to bisect.

### Quick reference
**Recommended execution order:**
`M0 → C5b → C9 → C4a → C6 → C1 → C7 → C4b → C2 → verify`

~4–6 dev-days total after the merge.

---

## 4. Implementation sketches (so the work can be quoted accurately)

### C3 — `QueryClient` defaults (the cheapest, broadest win)
```ts path=null start=null
// src/App.tsx
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});
```

### C2 — Route-level code splitting
```tsx path=null start=null
// src/App.tsx
import { lazy, Suspense } from 'react';
const Dashboard = lazy(() => import('./pages/Dashboard'));
// ...repeat for every page

<Suspense fallback={<FullPageLoader />}>
  <Routes>{/* ... */}</Routes>
</Suspense>
```
Plus `vite.config.ts`:
```ts path=null start=null
build: {
  rollupOptions: {
    output: {
      manualChunks: {
        radix: ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu', /* ... */],
        charts: ['recharts'],
        markdown: ['react-markdown', 'marked'],
      },
    },
  },
},
```

### C1 — Parallelize the `/:slug` waterfall
**Option A (minimal change):** run `account` and `producer` queries in parallel; combine `events` + `bookings` into one query that embeds bookings via Supabase's relational select.
**Option B (best):** create a single Postgres RPC `get_producer_page(slug text)` that returns producer + events + booking counts in one call.

### C4 — Realtime patch instead of invalidate
```ts path=null start=null
// AccountPage.tsx — inside .on('postgres_changes', ...):
queryClient.setQueryData<Booking[]>(['account-bookings', eventIds], (prev = []) => {
  switch (payload.eventType) {
    case 'INSERT': return [...prev, payload.new as Booking];
    case 'UPDATE': return prev.map(b => b.id === payload.new.id ? payload.new as Booking : b);
    case 'DELETE': return prev.filter(b => b.id !== (payload.old as any).id);
    default: return prev;
  }
});
```

---

## 5. How to verify the fixes worked

1. **Bundle size:** `npm run build` — confirm initial chunk drops below 250 KB gzipped.
2. **Lighthouse:** target LCP < 2.5 s and TBT < 200 ms on `/:slug` and `/dashboard` (mobile profile).
3. **Network panel:** on a hard reload of `/:slug`, confirm ≤ 2 sequential DB calls (down from 4).
4. **Supabase logs:** confirm a 50–70 % drop in `bookings` table read volume after C4.
5. **`web-vitals` reporter (C9):** capture FCP/LCP/INP percentiles before and after for a 24-hour window.

---

## 6. Caveats & honest limitations

- This audit is **static** — based on reading code, not measurement. Real-world numbers may shift the order. C9 (instrumentation) is included specifically so the next iteration is data-driven.
- I have not profiled potentially-heavy components (`MarkdownEditor`, `RecurrenceSelector`, `CalendarDashboard`). If users are reporting slowness while editing or viewing the calendar, those need their own deep-dive.
- I have not analyzed image/asset loading (`logo-vertical.png`, producer-uploaded images). Consider a separate review for image optimization (`loading="lazy"`, responsive `srcset`, WebP/AVIF).
- This list is **performance only**. The security backlog (`prompts/remediation-priorities.md`) is separate and partially overlaps in effort budget.
