import { describe, expect, it } from "vitest";

import {
  addOrderNoteSchema,
  changeOrderStatusSchema,
  retryOrderNotificationSchema,
} from "@/lib/admin-order-operations-schema";

const orderId = "7e27ec80-28ae-4d18-b1d6-15d452ecbaf4";

describe("admin order operation schemas", () => {
  it("accepts a known status and UUID order", () => {
    expect(changeOrderStatusSchema.parse({ orderId, status: "CONFIRMED" })).toEqual({
      orderId,
      status: "CONFIRMED",
    });
  });

  it("trims notes and rejects empty or oversized content", () => {
    expect(addOrderNoteSchema.parse({ orderId, body: "  Позвонить перед выездом  " }).body)
      .toBe("Позвонить перед выездом");
    expect(addOrderNoteSchema.safeParse({ orderId, body: "   " }).success).toBe(false);
    expect(addOrderNoteSchema.safeParse({ orderId, body: "x".repeat(1001) }).success).toBe(false);
  });

  it("requires both identifiers for a notification retry", () => {
    expect(retryOrderNotificationSchema.safeParse({ orderId, notificationId: "not-a-uuid" }).success)
      .toBe(false);
  });
});
