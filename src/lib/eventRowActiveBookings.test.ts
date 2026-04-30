import { describe, it, expect } from "vitest";
import { activeBookingsList } from "./eventRowActiveBookings";

describe("activeBookingsList", () => {
  it("returns empty array when bookings undefined", () => {
    expect(activeBookingsList(undefined)).toEqual([]);
  });

  it("filters out cancelled", () => {
    expect(
      activeBookingsList([
        { cancelled_at: null },
        { cancelled_at: "2026-01-01" },
      ])
    ).toEqual([{ cancelled_at: null }]);
  });
});
