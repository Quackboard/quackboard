

## Plan: Email Preview Page

Create a temporary route `/email-preview` that renders static HTML iframes showing all 6 email templates — current vs. proposed — so you can visually compare before any edge function code is touched.

### What gets created

**1 new file: `src/pages/EmailPreview.tsx`**

A page with tabs for each email type:
- **Guest Booking Confirmation** (current vs. proposed)
- **Guest Cancellation** (current vs. proposed — note: proposed removes the cancel button)
- **Guest Manual Add** (current vs. proposed)
- **Producer Booking Notification** (current vs. proposed)
- **Mic Goes Live** (current vs. proposed — color swap only)
- **Producer Activity Report** (current vs. proposed — color swap only)

Each tab shows two iframes side-by-side: "Current" and "Proposed". The HTML is hardcoded with sample data (event name, date, venue, guest info) so you see realistic previews.

**1 line added to `src/App.tsx`**: Route for `/email-preview`

### Proposed visual changes shown in preview

| Template | Current | Proposed |
|----------|---------|----------|
| Guest booking emails | div layout, `#f8f9fa` bg, blue `#007bff` buttons, no header/footer | Table layout, `#f5f5f5` outer bg, teal gradient header `#34a08c→#298070`, event card with emoji icons, teal buttons, QuackBoard footer |
| Guest cancellation | Same as above + red cancel button shown | Same modern layout, cancel button **removed** |
| Producer booking email | div layout, green `#28a745` accents, blue button | Table layout, teal gradient header, teal accents, QuackBoard footer |
| Mic Goes Live | Purple gradient `#4F46E5→#7C3AED` | Teal gradient `#34a08c→#298070` |
| Producer Notifications | Purple gradient, purple badges `#EEF2FF/#4F46E5`, purple footer link | Teal gradient, teal badges `#e6f5f2/#2a7d6b`, teal footer link |

### Risk: Zero
- This is a new preview page only — no edge function code is modified
- The route can be removed after review
- No database, API, or email logic is touched

### After your review
Once you approve the proposed designs in the preview, I'll apply the exact HTML from the "proposed" column to the edge functions — template-for-template, with no logic changes.

