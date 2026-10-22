import { describe, expect, it } from "vitest";

import { parseAdminOrderFilters, parseDashboardPeriod } from "@/lib/admin-orders-schema";

describe("admin order query parsing", () => {
  it("normalizes supported filters and swaps an inverted date range", () => {
    expect(parseAdminOrderFilters({
      q: "  +7 999  ",
      status: "DELIVERED",
      from: "2026-10-22",
      to: "2026-10-01",
      page: "3",
    })).toEqual({
      q: "+7 999",
      status: "DELIVERED",
      from: "2026-10-01",
      to: "2026-10-22",
      page: 3,
    });
  });

  it("falls back safely for malformed public search parameters", () => {
    expect(parseAdminOrderFilters({
      q: "x".repeat(100),
      status: "OWNER",
      from: "yesterday",
      page: "-4",
    })).toEqual({ q: "", status: undefined, from: undefined, to: undefined, page: 1 });
  });

  it("accepts only the dashboard periods exposed by the interface", () => {
    expect(parseDashboardPeriod("7")).toBe(7);
    expect(parseDashboardPeriod("365")).toBe(30);
    expect(parseDashboardPeriod(["90", "7"])).toBe(90);
  });
});
