/**
 * Explicit PostgREST column lists for `fetchAccountPageData` (batched /:slug load).
 * Must stay aligned with AccountPage header fallbacks + producer id / window.
 */
export const ACCOUNTS_FETCH_COLUMNS = [
  "id",
  "slug",
  "account_name",
  "venue_name",
  "venue_address",
  "bio_markdown",
  "instagram",
  "website",
  "header_image_url",
  "profile_image_url",
].join(", ");

export const PRODUCERS_FETCH_COLUMNS = [
  "id",
  "slug",
  "name",
  "event_window_days",
  "venue_name",
  "venue_address",
  "bio_markdown",
  "instagram",
  "website",
  "header_image_url",
  "profile_image_url",
].join(", ");
