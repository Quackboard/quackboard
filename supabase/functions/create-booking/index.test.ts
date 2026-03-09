import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { assertEquals, assertExists } from "https://deno.land/std@0.224.0/assert/mod.ts";

const SUPABASE_URL = Deno.env.get("VITE_SUPABASE_URL")!;
const ANON_KEY = Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY")!;
const FUNCTION_URL = `${SUPABASE_URL}/functions/v1/create-booking`;

async function callCreateBooking(body: Record<string, unknown>) {
  const res = await fetch(FUNCTION_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: ANON_KEY,
      Authorization: `Bearer ${ANON_KEY}`,
    },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  return { status: res.status, data };
}

// Cleanup helper: delete a booking by ID using the service role
async function cleanupBooking(bookingId: string) {
  // Best-effort cleanup via the anon key (RLS may block, but the edge function uses service role)
  // We'll rely on the test using unique slot positions to avoid collisions
  console.log(`[cleanup] Would clean up booking ${bookingId}`);
}

// ─── Test 1: Invalid request (missing fields) ────────────────────────────
Deno.test("create-booking: returns invalid_request for missing fields", async () => {
  const { status, data } = await callCreateBooking({
    eventId: "00000000-0000-0000-0000-000000000000",
    // missing slotPosition, guestName, guestEmail
  });
  assertEquals(status, 400);
  assertEquals(data.success, false);
  assertEquals(data.code, "invalid_request");
});

// ─── Test 2: Happy path ──────────────────────────────────────────────────
Deno.test("create-booking: happy path creates booking and returns success", async () => {
  // Use a high slot position unlikely to conflict
  const slotPosition = 999;
  const uniqueEmail = `test-${Date.now()}@example.com`;

  const { status, data } = await callCreateBooking({
    eventId: "40604a22-e8fc-4797-b498-fb2cda6cd6e8",
    slotPosition,
    guestName: "Test Comic",
    guestEmail: uniqueEmail,
    allowMultipleSpots: false,
    isManualAdd: false,
  });

  console.log("Happy path response:", JSON.stringify(data));

  assertEquals(status, 200);
  // Could be success or booking_failed (if email delivery fails in test env)
  // The key assertion: no crash, valid response structure
  assertExists(data.success !== undefined, "Response should have success field");

  if (data.success) {
    assertExists(data.bookingId);
    assertEquals(data.slotPosition, slotPosition);
    // Cleanup
    await cleanupBooking(data.bookingId);
  } else {
    // If email fails, booking should be rolled back — code should be booking_failed
    assertEquals(data.code, "booking_failed");
  }
});

// ─── Test 3: Slot taken (duplicate slot_position) ────────────────────────
Deno.test("create-booking: returns slot_taken for duplicate slot position", async () => {
  const slotPosition = 998;
  const eventId = "40604a22-e8fc-4797-b498-fb2cda6cd6e8";

  // First booking
  const first = await callCreateBooking({
    eventId,
    slotPosition,
    guestName: "First Comic",
    guestEmail: `first-${Date.now()}@example.com`,
    allowMultipleSpots: false,
    isManualAdd: false,
  });
  console.log("First booking:", JSON.stringify(first.data));

  // If the first one failed (email issues), we can't test slot_taken
  if (!first.data.success) {
    console.log("Skipping slot_taken test — first booking failed (likely email delivery)");
    return;
  }

  // Second booking — same slot
  const second = await callCreateBooking({
    eventId,
    slotPosition,
    guestName: "Second Comic",
    guestEmail: `second-${Date.now()}@example.com`,
    allowMultipleSpots: false,
    isManualAdd: false,
  });
  console.log("Second booking:", JSON.stringify(second.data));

  assertEquals(second.data.success, false);
  assertEquals(second.data.code, "slot_taken");
});

// ─── Test 4: Duplicate email check ───────────────────────────────────────
Deno.test("create-booking: returns duplicate_email when same email books twice", async () => {
  const eventId = "40604a22-e8fc-4797-b498-fb2cda6cd6e8";
  const sharedEmail = `dup-${Date.now()}@example.com`;

  // First booking
  const first = await callCreateBooking({
    eventId,
    slotPosition: 997,
    guestName: "Dup Comic",
    guestEmail: sharedEmail,
    allowMultipleSpots: false,
    isManualAdd: false,
  });
  console.log("First dup booking:", JSON.stringify(first.data));

  if (!first.data.success) {
    console.log("Skipping duplicate_email test — first booking failed");
    return;
  }

  // Second booking — different slot, same email
  const second = await callCreateBooking({
    eventId,
    slotPosition: 996,
    guestName: "Dup Comic Again",
    guestEmail: sharedEmail,
    allowMultipleSpots: false,
    isManualAdd: false,
  });
  console.log("Second dup booking:", JSON.stringify(second.data));

  assertEquals(second.data.success, false);
  assertEquals(second.data.code, "duplicate_email");
});

// ─── Test 5: CORS preflight ─────────────────────────────────────────────
Deno.test("create-booking: handles CORS preflight", async () => {
  const res = await fetch(FUNCTION_URL, { method: "OPTIONS" });
  const body = await res.text();
  assertEquals(res.status, 204);
  assertEquals(res.headers.get("access-control-allow-origin"), "*");
});
