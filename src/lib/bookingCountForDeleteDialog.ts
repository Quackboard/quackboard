/**
 * Source of truth for “N people will be removed” on UpcomingEventCard when
 * `event.bookings` is not loaded (list query uses `event_availability` only).
 */
export function bookingCountForDeleteDialog(
  availability: { booked_count: number } | null | undefined
): number {
  return availability?.booked_count ?? 0;
}
