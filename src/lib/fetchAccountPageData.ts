import { SupabaseClient } from "@supabase/supabase-js";
import { Event, Booking } from "@/types/database";
import {
  ACCOUNTS_FETCH_COLUMNS,
  PRODUCERS_FETCH_COLUMNS,
} from "@/lib/fetchAccountPageDataColumns";

export interface AccountPageData {
  account: Record<string, unknown> | null;
  producer: Record<string, unknown> | null;
  events: (Event & { bookings: Booking[] })[];
}

/**
 * Loads everything needed for /:slug in two round-trips instead of four:
 *   Batch 1 — accounts + producers in parallel (Promise.all)
 *   Batch 2 — events with bookings embedded in a single select
 *
 * Used by later Task C1 wiring; kept here with tests so integration is incremental.
 */
export async function fetchAccountPageData(
  slug: string,
  client: Pick<SupabaseClient, "from">
): Promise<AccountPageData> {
  const [
    { data: account, error: accountError },
    { data: producer, error: producerError },
  ] = await Promise.all([
    (client.from("accounts") as any)
      .select(ACCOUNTS_FETCH_COLUMNS)
      .eq("slug", slug)
      .maybeSingle(),
    (client.from("producers") as any)
      .select(PRODUCERS_FETCH_COLUMNS)
      .eq("slug", slug)
      .maybeSingle(),
  ]);

  if (accountError) throw accountError;
  if (producerError) throw producerError;

  const producerRow = producer as { id?: string } | null | undefined;
  if (!producerRow?.id) {
    return { account: account ?? null, producer: producer ?? null, events: [] };
  }

  const { data: rawEvents, error: eventsError } = await (client.from("events") as any)
    .select("*, bookings(id, event_id, slot_position, guest_name, cancelled_at)")
    .eq("producer_id", producerRow.id)
    .eq("status", "published")
    .order("date", { ascending: true })
    .order("start_time", { ascending: true });

  if (eventsError) throw eventsError;

  const events = ((rawEvents ?? []) as (Event & { bookings: Booking[] })[]).map((e) => ({
    ...e,
    bookings: (e.bookings ?? []).filter((b) => b.cancelled_at === null),
  }));

  return {
    account: account ?? null,
    producer: producer ?? null,
    events,
  };
}
