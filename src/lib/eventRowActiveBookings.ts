/** Past EventRow stats when embedded bookings may be omitted (should not happen on past tab). */
export function activeBookingsList(
  bookings: { cancelled_at: string | null }[] | undefined | null
): { cancelled_at: string | null }[] {
  return (bookings ?? []).filter((b) => !b.cancelled_at);
}
