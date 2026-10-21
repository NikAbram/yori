import { describe, expect, it } from "vitest";
import { getOrderStatusIndex, orderStatusLabels } from "./orders";

describe("order presentation data", () => {
  it("has a customer-facing label for every status", () => {
    expect(orderStatusLabels.NEW).toBe("Новый");
    expect(orderStatusLabels.CANCELLED).toBe("Отменён");
  });

  it("keeps the current status in the ordered timeline", () => {
    expect(getOrderStatusIndex("NEW")).toBe(0);
    expect(getOrderStatusIndex("COOKING")).toBe(2);
    expect(getOrderStatusIndex("CANCELLED")).toBe(-1);
  });
});
