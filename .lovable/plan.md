

## Fix: Update page title and meta tags for link previews

When sharing the link on mobile, the preview card shows "Lovable App" because the `<title>` and Open Graph meta tags in `index.html` still have the default Lovable values.

### Changes

**`index.html`** — Update these tags:
- `<title>` → "Quackboard Open Mics"
- `og:title` → "Quackboard Open Mics"
- `og:description` → something like "Find and sign up for open mics near you"
- `twitter:site` → remove or update the `@Lovable` reference
- `meta name="description"` → update from "Lovable Generated Project"
- `meta name="author"` → update from "Lovable"

Single file, ~6 line changes. No code logic affected.

