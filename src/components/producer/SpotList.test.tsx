import { describe, it, expect } from "vitest";

/**
 * Unit tests for the wildcard availability formula used in SpotList.
 * Formula: available = max(0, max(unfilledRegular, guaranteedSlots) - bookedWildcard)
 */
function calcAvailableWildcard(
  totalRegularSlots: number,
  bookedRegularCount: number,
  bookedWildcardCount: number,
  guaranteedSlots: number
) {
  return Math.max(
    0,
    Math.max(totalRegularSlots - bookedRegularCount, guaranteedSlots) - bookedWildcardCount
  );
}

describe("Wildcard availability formula", () => {
  it("unfilled regular spots exceed guaranteed → uses unfilled count", () => {
    // 10 regular, 6 booked regular, guaranteed 2 → unfilled=4, available=4
    expect(calcAvailableWildcard(10, 6, 0, 2)).toBe(4);
  });

  it("guaranteed exceeds unfilled → uses guaranteed count", () => {
    // 10 regular, 10 booked regular, guaranteed 5 → unfilled=0, available=5
    expect(calcAvailableWildcard(10, 10, 0, 5)).toBe(5);
  });

  it("subtracts booked wildcard from available", () => {
    // 10 regular, 10 booked, guaranteed 5, 2 wildcards booked → available=3
    expect(calcAvailableWildcard(10, 10, 2, 5)).toBe(3);
  });

  it("clamps to zero when all spots booked", () => {
    // 10 regular, 10 booked, guaranteed 3, 5 wildcards booked → max(0,3)-5 → 0
    expect(calcAvailableWildcard(10, 10, 5, 3)).toBe(0);
  });

  it("no guaranteed slots — only unfilled regular spots available", () => {
    // 10 regular, 7 booked, guaranteed 0 → unfilled=3, available=3
    expect(calcAvailableWildcard(10, 7, 0, 0)).toBe(3);
  });

  it("all regular filled, no guaranteed → zero wildcards", () => {
    expect(calcAvailableWildcard(10, 10, 0, 0)).toBe(0);
  });

  it("partial wildcard bookings with unfilled regular", () => {
    // 12 regular, 8 booked, guaranteed 2, 1 wildcard booked → max(4,2)-1=3
    expect(calcAvailableWildcard(12, 8, 1, 2)).toBe(3);
  });

  it("guaranteed equals unfilled — same result either way", () => {
    // 10 regular, 7 booked, guaranteed 3 → max(3,3)=3, available=3
    expect(calcAvailableWildcard(10, 7, 0, 3)).toBe(3);
  });
});
