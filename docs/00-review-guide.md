# QuackBoard — Documentation Review Guide

This directory contains five technical documents that describe the architecture, components, API contracts, use cases, and a design evaluation of the QuackBoard codebase. Use this guide to navigate them efficiently.

---

## Recommended Reading Order

| Step | Document | What You'll Learn | Time Estimate |
|------|----------|-------------------|---------------|
| 1 | [01-architecture-overview.md](./01-architecture-overview.md) | Big picture: what the app does, how the pieces fit together, the database schema, and the security model. | 10 min |
| 2 | [04-use-cases.md](./04-use-cases.md) | The concrete workflows that producers and comedians follow. Read this second so the remaining technical docs have real-world context. | 8 min |
| 3 | [02-frontend-components.md](./02-frontend-components.md) | Every route, page, component, and hook in the React app, with the state management strategy. | 12 min |
| 4 | [03-backend-api-contracts.md](./03-backend-api-contracts.md) | All Supabase Edge Functions with request/response schemas, error codes, and the email delivery pipeline. | 15 min |
| 5 | [05-design-evaluation.md](./05-design-evaluation.md) | Honest assessment of strengths, risks, and concrete improvement suggestions. | 10 min |

**Total: ~55 min for a thorough read.**

---

## How to Cross-Reference With Code

Each document references source files using relative paths. Here are the most important files to keep open while reading:

### While Reading 01 — Architecture
- `src/App.tsx` — route definitions and provider tree
- `src/contexts/AuthContext.tsx` — auth state management
- `src/integrations/supabase/client.ts` — Supabase client setup
- `src/integrations/supabase/types.ts` — auto-generated DB types
- `src/types/database.ts` — hand-written TS interfaces
- `supabase/config.toml` — Supabase project configuration

### While Reading 02 — Frontend Components
- `src/pages/` — all page-level components
- `src/components/` — shared and domain-specific components
- `src/hooks/` — custom hooks
- `src/lib/` — utility modules (email, slug, notifications)

### While Reading 03 — API Contracts
- `supabase/functions/` — each sub-directory is one Edge Function
- `src/lib/email.ts` — frontend wrappers that call the Edge Functions
- `src/lib/producer-notifications.ts` — notification trigger wrappers

### While Reading 04 — Use Cases
- `src/components/producer/SignUpModal.tsx` — comic sign-up flow
- `src/components/producer/SpotList.tsx` — wildcard section logic
- `src/pages/CreateMic.tsx` — event creation with recurrence
- `src/pages/CancelBooking.tsx` — cancellation flow

### While Reading 05 — Design Evaluation
- All files referenced in concerns/risks — the doc includes specific file paths and line ranges.

---

## Tips

- **Search the codebase:** When a document mentions a function or component, use your editor's search to jump to it.
- **Database schema:** The canonical schema lives in `supabase/migrations/`. The auto-generated TypeScript types are in `src/integrations/supabase/types.ts`.
- **Edge Functions run Deno:** They use `https://deno.land/std` and `https://esm.sh/` imports, not npm.
- **Environment variables:** Frontend env vars are prefixed with `VITE_`. Backend secrets are set via `supabase secrets set`.
