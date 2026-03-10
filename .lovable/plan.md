

## Add cancellation helper footnote to ProducerPage

### Change

**Modified: `src/pages/ProducerPage.tsx`**

Add a single line of muted footnote text between the event cards section and the existing footer. It will appear only when there are events to show.

```
Need to cancel? Look for the cancellation link in your confirmation email (subject: "Booking Confirmed").
```

Styled with `text-xs text-muted-foreground text-center` — small, muted, footnote-like. No new components or edge functions needed.

