

## Rename Page Title and Nav Labels to "Dashboard"

**Goal**: Change the page-level title and navigation labels from "Your Mics" to "Dashboard", while keeping "Your Mics" as the section header above the mic list.

### Changes

**1. `src/components/Navbar.tsx`**
- Change both desktop and mobile nav link labels from "Your Mics" to "Dashboard"

**2. `src/pages/Dashboard.tsx`**
- Change the page heading from "Your Mics" to "Dashboard"
- Keep "Your Mics" as a section header above the mic list/calendar (currently the heading doubles as both -- we'll separate them)

**3. Update the collapsible reorganization plan**
- When implementing the layout reorder (mics at top, share/embed collapsed below), the "Your Mics" label will serve as the section header for the events list, sitting above the view toggle and event rows
- "Dashboard" will be the main page title at the very top

### Result
- Nav menu says "Dashboard"
- Page title says "Dashboard"
- The mic list section is labeled "Your Mics"

