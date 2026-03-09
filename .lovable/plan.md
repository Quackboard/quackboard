

## Add "Powered by Quackboard" footer to public producer pages

Best practice for platform discovery on user-generated public pages is a **"Powered by" footer** — the same pattern used by Linktree, Calendly, Typeform, Substack, etc. It's subtle, non-intrusive, and drives organic growth from your users' audiences.

### What to add

A small footer at the bottom of the public producer page (`ProducerPage.tsx`) with:

- **Quackboard logo/wordmark** (text in Outfit font, matching brand)
- **"Powered by Quackboard"** text linking to the homepage
- **CTA line**: "Run an open mic? Get started for free" linking to `/signup`

This sits below all event cards, separated by whitespace. Subtle `text-muted-foreground` styling so it doesn't compete with the producer's content.

### Layout

```text
┌──────────────────────────────┐
│  Producer Header             │
│  Day Selector                │
│  Event Cards...              │
│                              │
│  ─────────────────────────   │
│  🦆 Powered by Quackboard   │
│  Run an open mic?            │
│  Get started for free →      │
└──────────────────────────────┘
```

### Changes

**`src/pages/ProducerPage.tsx`**
- Add a footer section after the events area with:
  - "Powered by Quackboard" linking to `/` (homepage)
  - "Run an open mic? Get started for free" linking to `/signup`
  - Styled small, muted, centered — `text-xs text-muted-foreground`

Single file, ~15 lines added. No new components needed.

