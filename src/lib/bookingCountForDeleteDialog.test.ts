import { describe, it, expect } from "vitest";
import { bookingCountForDeleteDialog } from "./bookingCountForDeleteDialog";

describe("bookingCountForDeleteDialog", () => {
  it("returns booked_count from availability", () => {
    expect(bookingCountForDeleteDialog({ total_slots: 10, booked_count: 4 })).toBe(4);
  });

  it("returns 0 when availability missing", () => {
    expect(bookingCountForDeleteDialog(null)).toBe(0);
    expect(bookingCountForDeleteDialog(undefined)).toBe(0);
  });
});
