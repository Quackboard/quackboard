# Performance work — notes for the app owner

This document is updated **after each performance task** is completed. You can copy a section below into email, Slack, or a PR description so you always know **what felt slow**, **what users might notice**, and **what we changed**—without digging into code.

**Location:** [`docs/performance-owner/CHANGELOG.md`](CHANGELOG.md) (this folder holds owner-facing performance updates only.)

---

## How to use this file (for collaborators)

1. When a task merges to `perf/integration` (or when you’re ready to tell the owner), **add a new dated section** using the **template** at the bottom.
2. Keep language **plain**; avoid jargon unless you add a one-line “in plain English” gloss.
3. Optional: paste a link to the PR or branch name in **Technical reference**.

---

## Task 1 — Performance foundations (completed)

**Date (approx.):** April 2026  
**Branch / integration:** `perf/task-1-query-defaults-and-columns` → `perf/integration`

### What was going wrong

- The app was doing **more network requests than necessary** in common situations (for example switching tabs or coming back to the browser window), because data was treated as “out of date” immediately.
- On the **producer dashboard**, loading the list of upcoming mics was also pulling **full booking lists** for every event even when the screen only needed **counts** (those counts already come from a lighter “availability” view).
- On the **public account page** (`your short link /{slug}`), the events list used a very wide **“give me everything”** database read, which made responses **larger and slower** than they needed to be.

### What users might have noticed

- The dashboard or public page could feel **sluggish or “busy”** when nothing obvious changed.
- After this work, **first paint and repeat visits** should feel a bit snappier; nothing about **who can sign up, emails, or security** was meant to change.

### What we changed (high level)

- Set a sensible default so the app **doesn’t refetch the whole world** on every tiny navigation or focus change; it trusts recent data for about **one minute** unless something explicitly refreshes it.
- **Dashboard:** upcoming list loads **leaner event data**; **past** events and **calendar** still load booking details where the UI actually needs them. **Delete mic** flows and warnings were kept accurate.
- **Public `/{slug}` page:** event rows now request **only the columns** the page displays, instead of every column in the database.
- Added **automated tests** around these choices so they don’t accidentally regress.
- Laid groundwork (not wired to the live page yet) for a future step that will **batch** several public-page requests into fewer round-trips.

### Technical reference (optional)

- React Query default client: `staleTime`, column helpers, `fetchAccountPageData` helper + tests, dashboard query split, `AccountPage` narrowed event `select`.

---

## Task 2 — Query defaults and leaner batch reads (completed)

**Date (approx.):** April 2026  
**Branch / integration:** `perf/task-2-query-client-config-default-queries` → `perf/integration`

### What was going wrong

- Even with **one-minute caching** from Task 1, the app could still **refetch lists when you only switched browser tabs** or brought the window forward, which added **extra network noise** without much benefit for most screens.
- Transient **one-off network blips** could trigger **more retries than needed** by default.
- A **batch helper** used for a future faster public page was still asking the database for **every column** on **accounts** and **producers**, which would make that path heavier than necessary when it goes live.

### What users might have noticed

- **Little or no visible change** for day-to-day flows; the goal is **fewer background requests** and **slightly more predictable** behavior after tab changes.
- **No change** to who can sign up, magic links, or security rules.

### What we changed (high level)

- Turned off **automatic refetch when the browser window regains focus** as a global default (data still refreshes when you navigate, when something explicitly invalidates it, or when it passes the **one-minute** freshness window).
- Set queries to **retry once** on failure instead of stacking many automatic retries.
- The batch public-page helper now requests **only the profile fields the public page actually uses** for accounts and producers, instead of **all columns**, so a future wired-up version stays lean.
- **Tests** cover the new defaults and the non–`select *` behavior for that helper.

### Risks / things to watch when testing

- If any screen **depended** on “always refetch when I click back into the tab,” it may feel **stale until you navigate or wait out the cache window**—say so if you spot a screen that needs a one-off **focus refetch** turned back on for that query only.
- Click through **dashboard**, **public `/{slug}`**, and **magic link login** once after deploy; behavior should match before, with less background churn.

### Technical reference (optional)

- `createQueryClient`: `refetchOnWindowFocus`, `retry`; `fetchAccountPageData` + `fetchAccountPageDataColumns`; Vitest updates.

---

## Task 3 — Less background polling on the public mic page (completed)

**Date (approx.):** April 2026  
**Branch / integration:** `perf/task-3-account-page-remove-bookings-poll` → `perf/integration`

### What was going wrong

- On the **public producer page** (`/{slug}`), the list of who booked which slot was **re-downloaded from the server every 10 seconds** for everyone viewing the page, **even when nothing changed**.
- The same page **already** listens for live database updates, so the timer was mostly **duplicate work**—extra traffic, battery, and load on a page that should feel light for comics signing up on their phones.

### What users might have noticed

- **Before:** Quiet background activity every few seconds while the page stayed open (often invisible, but it adds up at scale).
- **After:** Slot lists should still **update right away** when someone books or cancels (live updates and your own sign-up still refresh the list). **No change** to sign-up rules, emails, or security.

### What we changed (high level)

- **Removed** the fixed **every-10-seconds** refresh for bookings on the public page.
- **Kept** live updates when bookings change, and **kept** an immediate refresh after **you** successfully book a spot on that device.

### Risks / things to watch when testing

- We traded a small **“self-heal every 10 seconds”** safety net for **less background traffic**. If live updates were ever slow or blocked (unusual networks, strict firewalls), a tab could show **stale slots until you refresh the page**—not wrong payments or broken logins.
- **Please click once:** open a public `/{slug}` in **two browsers** (or two tabs with different users); book or release a slot in one and confirm the other updates. Try a normal sign-up on your phone once.

### Technical reference (optional)

- `AccountPage.tsx`: bookings `useQuery` no longer sets `refetchInterval`; realtime + `invalidateQueries` + `onBookingSuccess` unchanged.

---

## Template — copy for each new task

### Task N — **[short title]**

**Date:** YYYY-MM-DD  
**Branch / integration:** `perf/...` → `perf/integration` _(or PR link)_

#### What was going wrong

- _In 1–3 short sentences: what behavior or cost was bad (e.g. “too many refetches”, “big payloads”, “slow after login”)?_

#### What users might have noticed

- _What might feel different before vs after (or “no visible change—only speed/reliability”)?_

#### What we changed (high level)

- _Bullet list of outcomes, not file names._

#### Risks / things to watch when testing

- _Anything the owner should click through once (e.g. magic link, dashboard delete, public sign-up)._

#### Technical reference (optional)

- _PR link, branch name, or ticket ID._

---

_End of file — add new completed tasks above this line._
