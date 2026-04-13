## Add "Browse More Mics" link to public account pages

Add a subtle but noticeable link to `/browse` in the existing footer of `AccountPage.tsx`, just above the "Powered by Quackboard" branding. Keep it on-brand — casual, encouraging, not pushy.

### Changes

`**src/pages/AccountPage.tsx**` — Add a browse link in the footer section (around line 230):

```tsx
<footer className="mt-12 pt-6 border-t border-border text-center space-y-2">
  <div>
    <a href="/browse" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
      Looking for more mics? <span className="underline">Browse mics that fit your schedule </span> →
    </a>
  </div>
  <div>
    <a href="/" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
      <img src="/favicon.png" alt="Quackboard" className="h-4 w-4" />
      <span>Powered by <span className="font-medium font-outfit">Quackboard</span></span>
    </a>
  </div>
</footer>
```

One file, ~5 lines added. No other changes.