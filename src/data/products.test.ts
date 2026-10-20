import { describe, expect, it } from "vitest";

import { categories, products } from "@/data/products";

describe("catalog seed source", () => {
  it("contains exactly 25 uniquely addressable products", () => {
    expect(products).toHaveLength(25);
    expect(new Set(products.map(({ id }) => id)).size).toBe(products.length);
    expect(new Set(products.map(({ slug }) => slug)).size).toBe(products.length);
  });

  it("references known categories and stores valid integer kopek prices", () => {
    const categorySlugs = new Set(categories.map(({ slug }) => slug));

    for (const product of products) {
      expect(categorySlugs.has(product.category)).toBe(true);
      expect(Number.isSafeInteger(product.priceKopeks)).toBe(true);
      expect(product.priceKopeks).toBeGreaterThan(0);
      expect(product.image.startsWith("/images/products/")).toBe(true);
    }
  });
});
