import { describe, it, expect } from "vitest";
import { ACCOUNT_PAGE_EVENT_COLUMNS } from "./accountPageColumns";

describe("AccountPage event column selection", () => {
  it("is not SELECT *", () => {
    expect(ACCOUNT_PAGE_EVENT_COLUMNS).not.toBe("*");
    expect(ACCOUNT_PAGE_EVENT_COLUMNS).not.toContain("*");
  });

  it("includes columns required by AccountPage and EventCard", () => {
    const required = [
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
    ];
    for (const col of required) {
      expect(ACCOUNT_PAGE_EVENT_COLUMNS, `missing: ${col}`).toContain(col);
    }
  });
});
