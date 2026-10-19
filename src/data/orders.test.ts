import { describe, expect, it } from "vitest";
import { getOrderPreview, getOrderStatusIndex, previewOrder } from "./orders";

describe("order preview data", () => {
  it("returns only the safe preview order", () => {
    expect(getOrderPreview("preview")).toEqual(previewOrder);
    expect(getOrderPreview("someone-else-order")).toBeUndefined();
  });

  it("keeps the current status in the ordered timeline", () => {
    expect(getOrderStatusIndex("NEW")).toBe(0);
    expect(getOrderStatusIndex("COOKING")).toBe(2);
    expect(getOrderStatusIndex("CANCELLED")).toBe(-1);
  });
});
