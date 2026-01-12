# Quackboard Developer Documentation

Open mic management platform for comedy producers.

## Technology Stack

| Category | Technologies |
|----------|-------------|
| Frontend | React 18, Vite, TypeScript |
| Styling | Tailwind CSS, shadcn/ui |
| Backend | Supabase (PostgreSQL, Auth, RLS) |
| State Management | TanStack React Query |
| Routing | React Router DOM v6 |

## Supabase Access

### Public Credentials (safe in codebase)

- **Project ID:** `dkbahxjibpobbefqufqa`
- **Project URL:** `https://dkbahxjibpobbefqufqa.supabase.co`
- **Anon Key:** Located in `src/integrations/supabase/client.ts`

### Dashboard Access

To access the Supabase dashboard for schema editing, logs, and authentication management:

1. Request an invitation from the project owner
2. Dashboard: https://supabase.com/dashboard/project/dkbahxjibpobbefqufqa

**Dashboard provides access to:**
- Database schema and data editor
- Authentication settings and user management
- Row Level Security (RLS) policies
- Logs and monitoring
- Edge Functions

## Database Schema

| Table | Purpose |
|-------|---------|
| `producers` | User profiles (auto-created on signup) |
| `events` | Open mic events |
| `bookings` | Spot reservations |
| `event_templates` | Recurring event templates |
| `scheduled_messages` | Email scheduling |
| `message_templates` | Email templates |
| `message_logs` | Sent email records |
| `comic_profiles` | Comedian profiles |

### Key Database Features

- **Auto-profile creation:** The `handle_new_user()` trigger automatically creates a `producers` record when a user signs up
- **Types:** Database types are auto-generated in `src/integrations/supabase/types.ts`

## RLS Policies Summary

All tables have Row Level Security enabled:

- **Producers:** Can only access their own data
- **Events:** Published events are publicly viewable; producers manage their own
- **Bookings:** Publicly viewable for published events; producers manage their own event bookings
- **Templates/Messages:** Producers can only access their own

## Local Development

```bash
# Clone the repository
git clone <repo-url>
cd <project-folder>

# Install dependencies
npm install

# Start development server
npm run dev
```

## Project Structure

```
src/
├── pages/           # Route components (Dashboard, CreateMic, etc.)
├── components/      # UI components
│   ├── ui/          # shadcn/ui base components
│   ├── producer/    # Producer-specific components
│   ├── lineup/      # Lineup management components
│   └── dashboard/   # Dashboard components
├── contexts/        # AuthContext for authentication state
├── hooks/           # Custom React hooks
├── integrations/
│   └── supabase/    # Supabase client and types
├── types/           # TypeScript type definitions
├── lib/             # Utility functions
└── assets/          # Images and static assets

supabase/
├── config.toml      # Supabase configuration
└── migrations/      # Database migration SQL files
```

## Important Notes

- **Public pages:** `/producer/:slug` routes open in new browser tabs
- **Authentication:** Uses Supabase email/password auth
- **Onboarding:** New users complete onboarding to set up their producer profile
- **Logos:** `src/assets/logo-vertical.png` and `src/assets/logo-horizontal.png`

## Making Database Changes

Database changes are managed through Lovable's migration tool. Migration files are stored in `supabase/migrations/` and are read-only after creation.
