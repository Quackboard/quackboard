

## Show cancellation info in the sign-up modal

The friendliest, least interruptive approach: a single line of helper text in the `SignUpModal` that sets the expectation **before** they book — no extra UI, no separate page, no tooltip.

### What to add

In `src/components/producer/SignUpModal.tsx`, add a line just below the submit button (above the Terms/Privacy text):

> "You'll receive a confirmation email with a link to cancel if needed."

Styled as `text-xs text-muted-foreground text-center` — identical to the existing Terms line, so it feels native and doesn't add visual weight.

### Why this placement

- **Before booking**: Sets expectations proactively — comics know they'll get a cancel link
- **Near the email field context**: Reinforces why email matters (it's how they cancel)
- **Not in a toast**: Toasts disappear; this is always visible when it matters
- **Not on the event page itself**: Would add clutter to a page where most visitors haven't booked yet

### Change

**`src/components/producer/SignUpModal.tsx`** — Add one `<p>` tag between the submit button and the Terms line (~2 lines of code).

