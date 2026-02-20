

## Make Dashboard Action Buttons Mobile-Friendly

### Problem
The Edit, Duplicate, and Lineup links on mic cards are plain text links with no padding, making them nearly impossible to tap accurately on mobile. They sit in a tight horizontal row with minimal spacing.

### Solution
On mobile, switch the action links to full-width, properly-sized buttons stacked below the card content. On desktop, keep the current compact inline style.

### Changes

**File: `src/components/dashboard/EventRow.tsx`**

- Import `useIsMobile` hook and the `Button` component
- Replace the current actions `<div>` with a responsive layout:
  - **Mobile**: Render 3 equally-spaced buttons using the `outline` variant, each with proper height (`h-10`) and touch-friendly sizing, displayed in a horizontal row spanning the full card width
  - **Desktop**: Keep the current compact text links as-is
- This ensures each button meets the 44px minimum touch target on mobile

### Technical Detail

The mobile layout will use a `grid grid-cols-3 gap-2 w-full` container with `Button` components (variant `outline`, size `sm`) wrapping the existing `Link` elements via `asChild`. Desktop continues with the current `flex items-center gap-3 text-sm` layout.

