import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { calculateCartPricing, CartPricingError, priceCartFromDatabase } from "@/services/cart-pricing";

const firstId = "9ab96f80-58b8-4c49-8c93-1a6d282d3016";
const secondId = "532f7f9a-d932-4700-866b-d390a56b55f5";
const settings = {
  isOrderingEnabled: true,
  deliveryKopeks: 19_900,
  freeDeliveryFromKopeks: 180_000,
  minimumOrderKopeks: 70_000,
  cashOnDeliveryEnabled: true,
  cardOnDeliveryEnabled: false,
};

describe("cart pricing", () => {
  it("uses current database prices and integer kopek arithmetic", () => {
    const result = calculateCartPricing(
      [{ productId: firstId, quantity: 2 }],
      [{ id: firstId, name: "Филадельфия", priceKopeks: 64_900, isAvailable: true }],
      settings,
    );

    expect(result).toMatchObject({
      subtotalKopeks: 129_800,
      deliveryKopeks: 19_900,
      discountKopeks: 0,
      totalKopeks: 149_700,
      lines: [{ unitPriceKopeks: 64_900, quantity: 2, lineTotalKopeks: 129_800 }],
    });
  });

  it("makes delivery free at the configured threshold", () => {
    const result = calculateCartPricing(
      [{ productId: firstId, quantity: 3 }],
      [{ id: firstId, name: "Филадельфия", priceKopeks: 64_900, isAvailable: true }],
      settings,
    );

    expect(result.deliveryKopeks).toBe(0);
    expect(result.totalKopeks).toBe(194_700);
  });

  it("rejects unavailable and missing products", () => {
    expect(() => calculateCartPricing(
      [{ productId: firstId, quantity: 1 }],
      [{ id: firstId, name: "Филадельфия", priceKopeks: 64_900, isAvailable: false }],
      { ...settings, minimumOrderKopeks: 0 },
    )).toThrowError(expect.objectContaining({ code: "ITEM_UNAVAILABLE" }));

    expect(() => calculateCartPricing(
      [{ productId: secondId, quantity: 1 }],
      [],
      { ...settings, minimumOrderKopeks: 0 },
    )).toThrow(CartPricingError);
  });

  it("rejects a subtotal below the database minimum", () => {
    expect(() => calculateCartPricing(
      [{ productId: firstId, quantity: 1 }],
      [{ id: firstId, name: "Маки", priceKopeks: 22_900, isAvailable: true }],
      settings,
    )).toThrowError(expect.objectContaining({
      code: "MINIMUM_ORDER_NOT_MET",
      details: { minimumOrderKopeks: 70_000 },
    }));
  });

  it("reads products and settings together immediately before pricing", async () => {
    const transaction = {
      product: { findMany: vi.fn().mockResolvedValue([
        { id: firstId, name: "Филадельфия", priceKopeks: 64_900, isAvailable: true },
      ]) },
      siteSettings: { findUnique: vi.fn().mockResolvedValue(settings) },
    };

    const result = await priceCartFromDatabase(
      transaction as never,
      [{ productId: firstId, quantity: 2 }],
    );

    expect(result.totalKopeks).toBe(149_700);
    expect(transaction.product.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ id: { in: [firstId] }, isPublished: true }),
    }));
    expect(transaction.siteSettings.findUnique).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: "default" },
    }));
  });
});
