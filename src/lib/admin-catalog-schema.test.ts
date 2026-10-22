import { describe, expect, it } from "vitest";

import {
  adminCategoryInputSchema,
  adminProductInputSchema,
  rublesToKopeks,
} from "@/lib/admin-catalog-schema";

const validProduct = {
  categoryId: "69b94729-f42f-4db4-9143-c9736270ce6d",
  name: "Ролл QA",
  slug: "qa-roll",
  description: "Проверочное описание блюда.",
  ingredientsText: "рис, лосось\nнори",
  allergensText: "рыба",
  imagePath: "/images/products/salmon-roll-dark.webp",
  imageAlt: "Роллы с лососем на тёмной тарелке",
  weightGrams: "240",
  volumeMl: "",
  piecesCount: "8",
  priceRubles: "649,90",
  badge: "Хит",
  isAvailable: true,
  isPublished: true,
  isFeatured: false,
  isRecommended: true,
  sortOrder: "12",
};

describe("admin catalog schemas", () => {
  it("converts decimal rubles to integer kopeks without float arithmetic", () => {
    expect(rublesToKopeks("649,90")).toBe(64_990);
    expect(rublesToKopeks("10.05")).toBe(1_005);
    expect(rublesToKopeks("7")).toBe(700);
  });

  it("normalizes product lists, optional measurements and price", () => {
    const result = adminProductInputSchema.parse(validProduct);

    expect(result).toMatchObject({
      ingredients: ["рис", "лосось", "нори"],
      allergens: ["рыба"],
      priceKopeks: 64_990,
      weightGrams: 240,
      volumeMl: null,
      piecesCount: 8,
    });
  });

  it("rejects arbitrary image paths and products without a measurable size", () => {
    expect(adminProductInputSchema.safeParse({ ...validProduct, imagePath: "https://example.com/a.jpg" }).success).toBe(false);
    expect(adminProductInputSchema.safeParse({
      ...validProduct,
      weightGrams: "",
      volumeMl: "",
      piecesCount: "",
    }).success).toBe(false);
  });

  it("validates category slugs and normalizes an empty eyebrow", () => {
    const valid = adminCategoryInputSchema.parse({
      name: "Сеты",
      shortName: "Сеты",
      eyebrow: "",
      slug: "sets-qa",
      sortOrder: "10",
      isPublished: false,
    });

    expect(valid).toMatchObject({ eyebrow: null, sortOrder: 10 });
    expect(adminCategoryInputSchema.safeParse({ ...valid, sortOrder: "10", slug: "Сеты" }).success).toBe(false);
  });
});
