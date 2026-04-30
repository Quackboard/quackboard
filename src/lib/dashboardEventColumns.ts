const BASE_COLUMNS = [
  "id",
  "title",
  "date",
  "created_at",
  "start_time",
  "end_time",
  "venue_name",
  "sections_config",
  "status",
  "publish_at",
  "signup_opens_at",
  "template_id",
].join(", ");

/** Upcoming list: slot counts come from `event_availability`; no embedded bookings. */
export const DASHBOARD_EVENT_COLUMNS = BASE_COLUMNS;

/** Calendar + EventDetailDialog: needs per-booking rows for “spots filled” in the dialog. */
export const DASHBOARD_CALENDAR_EVENT_COLUMNS =
  `${BASE_COLUMNS}, bookings (id, slot_position, cancelled_at)`;

/** Past tab: EventRow uses embedded bookings for per-section stats. */
export const DASHBOARD_PAST_EVENT_COLUMNS =
  `${BASE_COLUMNS}, bookings (id, slot_position, cancelled_at)`;
