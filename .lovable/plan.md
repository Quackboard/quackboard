## Make Browse Mics More Prominent for Comics

### What we're building

Add a dedicated section on the landing page aimed at **comics** (not producers) with a friendly message, value prop, and CTA to browse open mics. This sits between the features grid and the final CTA section.

### Changes

`**src/pages/Index.tsx**` — Add a new section after the features grid (after line 107):

- Friendly headline: something like **"Looking for stage time?"**
- Short value prop: "Browse open mics happening this week and grab a spot. No account needed!"
- A prominent CTA button: **"Browse Open Mics →"** linking to `/browse`
- Styled as a standout banner — uses `bg-primary/5` or `bg-accent` tones with a border to differentiate it from the producer-focused sections above
- Include a `Mic` icon for personality

### Layout sketch

```text
┌──────────────────────────────────────────────┐
│  🎤  Looking for stage time?                 │
│                                              │
│  Browse open mics happening this week and    │
│  grab a spot — no account needed.            │
│                                              │
│          [ Browse Open Mics → ]              │
└──────────────────────────────────────────────┘
```

### Files touched

- `src/pages/Index.tsx` only

Put this above the fold. 