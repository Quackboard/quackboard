import { describe, it, expect } from "vitest";
import {
  DASHBOARD_CALENDAR_EVENT_COLUMNS,
  DASHBOARD_EVENT_COLUMNS,
  DASHBOARD_PAST_EVENT_COLUMNS,
} from "./dashboardEventColumns";

describe("Dashboard event column selection", () => {
  describe("DASHBOARD_EVENT_COLUMNS (upcoming list)", () => {
    it("does not embed bookings", () => {
      expect(DASHBOARD_EVENT_COLUMNS).not.toContain("bookings");
    });

    it("includes columns required for grouping and UpcomingEventCard", () => {
      const required = [
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
      ];
      for (const col of required) {
        expect(DASHBOARD_EVENT_COLUMNS, `missing: ${col}`).toContain(col);
      }
    });
  });

  describe("DASHBOARD_CALENDAR_EVENT_COLUMNS", () => {
    it("embeds bookings for EventDetailDialog", () => {
      expect(DASHBOARD_CALENDAR_EVENT_COLUMNS).toContain("bookings");
    });
  });

  describe("DASHBOARD_PAST_EVENT_COLUMNS", () => {
    it("includes bookings for EventRow section stats", () => {
      expect(DASHBOARD_PAST_EVENT_COLUMNS).toContain("bookings");
    });
  });
});
