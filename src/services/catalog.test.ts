import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  categoryFindMany: vi.fn(),
  productFindMany: vi.fn(),
  productFindFirst: vi.fn(),
  cacheLife: vi.fn(),
  cacheTag: vi.fn(),
  revalidateTag: vi.fn(),
  updateTag: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({
  cacheLife: mocks.cacheLife,
  cacheTag: mocks.cacheTag,
  revalidateTag: mocks.revalidateTag,
  updateTag: mocks.updateTag,
}));
vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    category: { findMany: mocks.categoryFindMany },
    product: {
      findMany: mocks.productFindMany,
      findFirst: mocks.productFindFirst,
    },
  },
}));

import {
  CATALOG_CACHE_TAG,
  expirePublicCatalogCache,
  getPublicCatalog,
  getPublicProductBySlug,
  revalidatePublicCatalog,
} from "@/services/catalog";

const categoryRow = {
  slug: "tempura",
  name: "Темпура",
  shortName: "Темпура",
  eyebrow: null,
};

const productRow = {
  id: "69b94729-f42f-4db4-9143-c9736270ce6d",
  slug: "shrimp-tempura",
  name: "Темпура с креветкой",
  description: "Хрустящий ролл",
  ingredients: ["креветка", "рис"],
  allergens: ["ракообразные"],
  imagePath: "/images/products/tempura-roll.webp",
  imageAlt: "Хрустящие роллы темпура с соусом",
  priceKopeks: 59900,
  weightGrams: 240,
  volumeMl: null,
  piecesCount: 8,
  badge: "Новинка",
  isAvailable: true,
  isFeatured: true,
  isRecommended: false,
  sortOrder: 14,
  category: { slug: "tempura" },
};

describe("catalog service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.categoryFindMany.mockResolvedValue([categoryRow]);
    mocks.productFindMany.mockResolvedValue([productRow]);
  });

  it("returns published catalog DTOs and strips database-only fields", async () => {
    const catalog = await getPublicCatalog();

    expect(catalog.categories).toEqual([
      { slug: "tempura", name: "Темпура", shortName: "Темпура", eyebrow: "" },
    ]);
    expect(catalog.products).toEqual([
      expect.objectContaining({
        id: productRow.id,
        slug: "shrimp-tempura",
        category: "tempura",
        image: productRow.imagePath,
        priceKopeks: 59900,
      }),
    ]);
    expect(catalog.products[0]).not.toHaveProperty("createdAt");
    expect(mocks.categoryFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { isPublished: true } }),
    );
    expect(mocks.productFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { isPublished: true, category: { isPublished: true } },
      }),
    );
    expect(mocks.cacheLife).toHaveBeenCalledWith("hours");
    expect(mocks.cacheTag).toHaveBeenCalledWith(CATALOG_CACHE_TAG);
  });

  it("returns only a published product together with its category name", async () => {
    mocks.productFindFirst.mockResolvedValue({
      ...productRow,
      category: { slug: "tempura", name: "Темпура" },
    });

    await expect(getPublicProductBySlug("shrimp-tempura")).resolves.toEqual({
      product: expect.objectContaining({ slug: "shrimp-tempura", category: "tempura" }),
      categoryName: "Темпура",
    });
    expect(mocks.productFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          slug: "shrimp-tempura",
          isPublished: true,
          category: { isPublished: true },
        },
      }),
    );
  });

  it("exposes tag-based invalidation for future catalog mutations", () => {
    revalidatePublicCatalog();
    expect(mocks.revalidateTag).toHaveBeenCalledWith(CATALOG_CACHE_TAG, "max");

    expirePublicCatalogCache();
    expect(mocks.updateTag).toHaveBeenCalledWith(CATALOG_CACHE_TAG);
  });
});
