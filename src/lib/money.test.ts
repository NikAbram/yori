import { describe, expect, it } from "vitest";
import { DELIVERY_KOPEKS, FREE_DELIVERY_FROM_KOPEKS, deliveryFor, formatMoney } from "./money";

describe("money", () => {
  it("formats integer kopeks without floating point arithmetic", () => {
    expect(formatMoney(64_900)).toContain("649");
  });

  it("calculates delivery boundaries in kopeks", () => {
    expect(deliveryFor(0)).toBe(0);
    expect(deliveryFor(FREE_DELIVERY_FROM_KOPEKS - 1)).toBe(DELIVERY_KOPEKS);
    expect(deliveryFor(FREE_DELIVERY_FROM_KOPEKS)).toBe(0);
  });
});
