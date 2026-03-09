

## Add legal consent text to SignUpModal

### What
Add a small consent line below the "Grab Spot" button in the SignUpModal that reads:
_"By signing up, you agree to our [Terms of Service](/terms) and [Privacy Policy](/privacy)."_

This is the standard pattern used by virtually all SaaS products for lightweight consent at point of data collection.

### Changes

**`src/components/producer/SignUpModal.tsx`**
- Add a `<p>` with consent text and links to `/terms` and `/privacy` below the submit `<Button>`
- Links open in new tabs (`target="_blank"`) since the modal shouldn't close
- Style: `text-xs text-muted-foreground text-center`

### Also recommended (optional, same PR)

**`src/pages/Signup.tsx`** — Add the same consent line below the "Get Started" button on the producer signup page.

Single file change, ~5 lines added. No logic changes.

