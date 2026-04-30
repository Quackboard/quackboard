# QuackBoard — Prioritized Remediation (Security & Performance)

Priority is scored on **Severity × Likelihood × Blast Radius**. Effort is in dev-days for a single mid-level engineer familiar with the stack, including testing.

Legend: 🔴 P0 (do now) · 🟠 P1 (this sprint) · 🟡 P2 (next sprint) · 🟢 P3 (backlog / cleanup)

## Security

| # | Pri | Issue | Why it matters | Fix outline | Effort |
|---|---|---|---|---|---|
| S1 | 🔴 P0 | `/admin` mounted without `ProtectedRoute` (`src/App.tsx:67`) | If the inner page only checks `user != null`, any signed-in user reaches admin tools; if it relies purely on RLS, UI still leaks structure. | Wrap with `ProtectedRoute` + role check (e.g. `producers.is_admin` column or `admin_users` table). Add an RLS `EXISTS` policy mirroring the role for any admin-only tables. | 0.5–1d |
| S2 | 🔴 P0 | Markdown → HTML injection in emails (`producer_message`) | `marked.parse(...)` output is interpolated raw into `htmlbody` in both `supabase/functions/create-booking/index.ts` and `supabase/functions/send-booking-email/index.ts`. `marked` permits raw HTML — a producer can inject phishing links / forged buttons into every guest email sent from their account. | Configure `marked` with `{ gfm: true, breaks: true }`, then sanitize the output through DOMPurify (or `sanitize-html`) with an allow-list. HTML-escape all other interpolated user fields (`title`, `guest_name`, `producer.name`, etc.). | 1–1.5d |
| S3 | 🔴 P0 | Public Edge Functions with `verify_jwt = false` and no rate limit | `create-booking`, `cancel-booking`, `auth-email-hook`, `regenerate-recurring-events` are reachable anonymously. An attacker can burn Zeptomail quota, spam guests, or scrape valid `event_id`s. | (a) Add per-IP + per-event rate limit (Postgres counter, Upstash, or pg-cron sweep). (b) Add hCaptcha / Turnstile on the public sign-up form. (c) Verify `Origin` header against an allow-list. (d) Lock `regenerate-recurring-events` behind `verify_jwt=true` and call from a scheduler with a service token. | 2–3d |
| S4 | 🟠 P1 | Wide-open CORS (`Access-Control-Allow-Origin: *`) on every Edge Function | Lets any origin call the functions; pairs poorly with S3. Also defeats CSRF assumptions. | Centralize CORS in `_shared/cors.ts`, allow-list the production domain, the Lovable preview domain, and `localhost` in dev. Keep wildcard only on the `/embed` read-only function (it legitimately needs cross-origin). | 0.5d |
| S5 | 🟠 P1 | Cancel token never expires / single-factor URL | A leaked or forwarded email forever lets anyone cancel and toggle alert preferences. | Add `cancel_token_expires_at` (e.g. `event_date + 1 day`); rotate the token after use; for authenticated comics, redirect to an in-app preferences screen instead of token URL. | 1–1.5d |
| S6 | 🟠 P1 | Email rollback is non-atomic with slot uniqueness | INSERT-then-DELETE-on-email-fail can briefly hold a slot, causing concurrent users to see `slot_taken` for a slot that gets freed. | Use a Postgres function (`rpc`) for INSERT inside a transaction, send email outside the tx, and queue email via an outbox table (`pg_net` or scheduled drain). Finalize booking only after email is accepted. | 1–2d |
| S7 | 🟡 P2 | Trust-the-body fields (`producer_id`, etc.) in some Edge Functions | `send-booking-email` looks up the booking, but downstream code paths still trust `event.producer_id` from the request body. | Always derive trust-anchored fields server-side from `bookingId` / `eventId`; ignore client-supplied IDs except as lookup keys. | 0.5d |
| S8 | 🟡 P2 | Alert preferences stored in `localStorage` only | Device-bound, not user-bound; no audit trail; fails GDPR/CAN-SPAM unsubscribe compliance posture. | Persist to a `user_email_preferences` table keyed by `guest_email` + `producer_id`, RLS-protected via token; migrate localStorage values on next visit. | 1–2d |
| S9 | 🟡 P2 | PII (guest emails/names) retained indefinitely in `bookings` & `message_logs` | GDPR/CCPA exposure; no documented retention. | Add a retention policy (cron deletes/anonymizes after `event_date + N` days); document in the privacy page. | 1d |
| S10 | 🟢 P3 | RLS policy audit across all migrations | ~30 migrations modify policies; drift risk and partial coverage are likely. | Generate a single `policies.sql` snapshot from `pg_policies`, review each table for SELECT/INSERT/UPDATE/DELETE coverage, write `pgTAP` or basic SQL tests in CI. | 1–2d |
| S11 | 🟢 P3 | Anon key + project URL hard-coded in `src/integrations/supabase/client.ts` | Working as designed for Supabase, but blocks a clean staging/prod split. | Move to `import.meta.env.VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY`; use Vite mode-based `.env.*` files. | 0.5d |

## Performance

| # | Pri | Issue | Why it matters | Fix outline | Effort |
|---|---|---|---|---|---|
| P1 | 🔴 P0 | Synchronous email on booking critical path | Up to ~4.5s of retry backoff before the user sees confirmation; any Zeptomail outage rolls back otherwise-valid bookings. | Outbox pattern: INSERT booking + outbox row in one tx, return success immediately; a worker (`pg_net` or a scheduled function every minute) drains the outbox with retries / DLQ. | 2–3d |
| P2 | 🟠 P1 | No code splitting; static imports of all 25 pages in `App.tsx` | Initial JS bundle ships Radix + recharts + react-markdown + every page. Significant TTI penalty on mobile. | Convert each route to `React.lazy(() => import(...))` + `<Suspense fallback>`. Split recharts / react-markdown into separate chunks via `manualChunks`. | 1–1.5d |
| P3 | 🟠 P1 | `ProtectedRoute` re-queries `producers.slug` on every navigation | Extra Supabase round-trip per protected route change; flash of loader. | Cache via React Query with key `['producer-slug', user.id]` and `staleTime: Infinity`; invalidate on onboarding completion. | 0.5d |
| P4 | 🟠 P1 | DB indexing review for hot paths | Booking lookups, digest emails, and lineup loads scale with `bookings × events`; missing composite indexes will degrade at growth. | Add indexes on `bookings(event_id, cancelled_at)`, `bookings(guest_email, event_id)`, `events(producer_id, date)`, `message_logs(booking_id)`, `events(status, date)`. Verify with `EXPLAIN ANALYZE`. | 0.5–1d |
| P5 | 🟡 P2 | Duplicate HTML render paths across two Edge Functions | `create-booking` and `send-booking-email` each carry ~250 lines of email HTML — drift risk + larger cold-start. | Extract a shared `supabase/functions/_shared/email-templates.ts` with pure render functions; both functions import. | 1d |
| P6 | 🟡 P2 | Redundant event re-fetch in `send-booking-email` | After `create-booking` already loaded the event, we re-read it. | Pass the needed fields in the request body (validated against `bookingId`) or merge the two flows. | 0.5d |
| P7 | 🟡 P2 | No DLQ / retry for digest / scheduled emails | Failures only `console.error`. | Add a `notification_failures` table (or reuse `message_logs.delivery_status = 'failed'`) and a daily retry sweep with `max_attempts`. | 1d |
| P8 | 🟢 P3 | Three lockfiles (`bun.lock`, `package-lock.json`, `deno.lock`) | Drift between local and CI; supply-chain confusion. | Pick one Node-side runtime (npm **or** bun) and delete the other lockfile; update CI + docs. `deno.lock` is fine to keep (Edge Functions). | 0.25d |
| P9 | 🟢 P3 | Wildcard CORS + Edge cold starts | Minor latency on first hit. | Mostly addressed by S4 + bundling shared code under `_shared/`. | trivial |
| P10 | 🟢 P3 | Vite chunking not configured | Even after route splitting, the vendor chunk is huge. | Add `build.rollupOptions.output.manualChunks` for `react`, `radix`, `recharts`, `markdown`. | 0.25d |

## Suggested Sequencing (4 sprints)

```text
Sprint 1 (P0):  S1, S2, S3, P1
Sprint 2 (P1):  S4, S5, S6, P2, P3, P4
Sprint 3 (P2):  S7, S8, S9, P5, P6, P7
Sprint 4 (P3):  S10, S11, P8, P9, P10
```

**Total estimated effort:** ~16–22 dev-days. The P0 block alone is ~5–8 days and addresses roughly 80% of the externally-exploitable surface and the worst UX latency.

## Tracking suggestions
- Open one ticket per row above with the row's ID (`S1`, `P3`, …) as a label.
- Add a "Definition of Done" requiring: code change + test + doc update + entry in `DEVELOPER.md` if behavior changes.
- For each P0 item, add a smoke test in CI that fails if the regression returns (e.g. lint rule for missing `ProtectedRoute`, sanitizer unit test for `producer_message`, integration test that a function rejects a forged `Origin`).
