

## Delete single event row

**Target**: "No Bad Mics" — 2026-04-14 at 20:30 — ID `f8bf1e9b-ebfb-4e97-9f88-9c46f3d2fcaf`

**What will happen**:
- The event row is deleted from the `events` table
- 4 associated bookings (2 active, 2 cancelled) are cascade-deleted automatically
- No emails are sent to Colin or Grant — they won't be notified (same as current delete behavior)
- No other events are touched

**Migration SQL**:
```sql
DELETE FROM events WHERE id = 'f8bf1e9b-ebfb-4e97-9f88-9c46f3d2fcaf';
```

One migration, one row, done.

