/** Columns needed for `/ :slug` (AccountPage) + EventCard / SpotList — avoid `SELECT *`. */
export const ACCOUNT_PAGE_EVENT_COLUMNS = [
  "id",
  "date",
  "start_time",
  "end_time",
  "venue_name",
  "venue_address",
  "sections_config",
  "allow_multiple_slots",
  "signup_opens_at",
  "publish_at",
].join(", ");
