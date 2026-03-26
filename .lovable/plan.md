

## Plan: Update Profile Setup & Edit Profile Labels + Enable Hyperlinks

### Changes

**1. `src/pages/Onboarding.tsx`**
- Rename "Name" label to **"Mic Name"** and add helper text: *"This will be the title of your public page"*
- Change bio label from `Bio (optional)` to **"Display Text for Public Page"** (remove "optional")
- Pass `showLink={true}` to the MarkdownEditor (currently `showLink={false}`)

**2. `src/pages/EditProfile.tsx`**
- Rename "Name" label to **"Mic Name"** and add helper text: *"This will be the title of your public page"*
- Change bio label from `Bio (optional)` to **"Display Text for Public Page"** (remove "optional")
- Pass `showLink={true}` to the MarkdownEditor (currently `showLink={false}`)

### What stays the same
- The MarkdownEditor already has full link support (toolbar button + markdown rendering) -- it just needs `showLink={true}` to show the link button
- No schema, validation, or database changes needed
- The bio field remains optional in validation (empty string allowed) -- we're just removing the "(optional)" label text

