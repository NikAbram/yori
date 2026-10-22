import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireCurrentAdmin: vi.fn(),
  categoryFindMany: vi.fn(),
  categoryFindUnique: vi.fn(),
  categoryCreate: vi.fn(),
  categoryUpdateMany: vi.fn(),
  productFindMany: vi.fn(),
  productFindUnique: vi.fn(),
  productCreate: vi.fn(),
  productUpdateMany: vi.fn(),
  productDeleteMany: vi.fn(),
  transaction: vi.fn(),
  txCategoryFindUnique: vi.fn(),
  txCategoryDelete: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/services/admin-auth", () => ({ requireCurrentAdmin: mocks.requireCurrentAdmin }));
vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    category: {
      findMany: mocks.categoryFindMany,
      findUnique: mocks.categoryFindUnique,
      create: mocks.categoryCreate,
      updateMany: mocks.categoryUpdateMany,
    },
    product: {
      findMany: mocks.productFindMany,
      findUnique: mocks.productFindUnique,
      create: mocks.productCreate,
      updateMany: mocks.productUpdateMany,
      deleteMany: mocks.productDeleteMany,
    },
    $transaction: mocks.transaction,
  },
}));

import {
  createAdminCategory,
  createAdminProduct,
  deleteAdminCategory,
  deleteAdminProduct,
  getAdminCatalogOverview,
  getAdminProductEditor,
  updateAdminCategory,
  updateAdminProduct,
} from "@/services/admin-catalog";

const categoryData = {
  name: "QA категория",
  shortName: "QA",
  eyebrow: null,
  slug: "qa-category",
  sortOrder: 90,
  isPublished: true,
};

const productData = {
  categoryId: "69b94729-f42f-4db4-9143-c9736270ce6d",
  name: "QA товар",
  slug: "qa-product",
  description: "Описание тестового товара",
  ingredients: ["рис"],
  allergens: [],
  imagePath: "/images/products/sushi-set.webp" as const,
  imageAlt: "Тестовый сет роллов",
  weightGrams: 200,
  volumeMl: null,
  piecesCount: 8,
  priceKopeks: 45_900,
  badge: null,
  isAvailable: true,
  isPublished: true,
  isFeatured: false,
  isRecommended: false,
  sortOrder: 90,
};

describe("admin catalog service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireCurrentAdmin.mockResolvedValue({ id: "admin-id", role: "OWNER" });
    mocks.categoryFindMany.mockResolvedValue([]);
    mocks.productFindMany.mockResolvedValue([]);
    mocks.categoryCreate.mockResolvedValue({ id: "category-id" });
    mocks.categoryUpdateMany.mockResolvedValue({ count: 1 });
    mocks.productCreate.mockResolvedValue({ id: "product-id" });
    mocks.productUpdateMany.mockResolvedValue({ count: 1 });
    mocks.productDeleteMany.mockResolvedValue({ count: 1 });
    mocks.transaction.mockImplementation((callback) => callback({
      category: {
        findUnique: mocks.txCategoryFindUnique,
        delete: mocks.txCategoryDelete,
      },
    }));
    mocks.txCategoryFindUnique.mockResolvedValue({ _count: { products: 0 } });
    mocks.txCategoryDelete.mockResolvedValue({ id: "category-id" });
  });

  it("authenticates before listing categories and products with explicit selects", async () => {
    await expect(getAdminCatalogOverview()).resolves.toEqual({ categories: [], products: [] });

    expect(mocks.requireCurrentAdmin).toHaveBeenCalledOnce();
    expect(mocks.categoryFindMany).toHaveBeenCalledWith(expect.objectContaining({
      select: expect.objectContaining({ id: true, slug: true, _count: expect.any(Object) }),
    }));
    expect(mocks.productFindMany).toHaveBeenCalledWith(expect.objectContaining({
      select: expect.objectContaining({ id: true, priceKopeks: true, category: expect.any(Object) }),
    }));
  });

  it("loads product editor data in parallel without exposing unrelated fields", async () => {
    mocks.categoryFindMany.mockResolvedValue([{ id: "category-id" }]);
    mocks.productFindUnique.mockResolvedValue({ id: "product-id", name: "QA" });

    await expect(getAdminProductEditor("product-id")).resolves.toEqual({
      categories: [{ id: "category-id" }],
      product: { id: "product-id", name: "QA" },
    });
    expect(mocks.productFindUnique).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: "product-id" },
      select: expect.not.objectContaining({ orderItems: true }),
    }));
  });

  it("creates and updates validated catalog records", async () => {
    await createAdminCategory(categoryData);
    await updateAdminCategory("category-id", categoryData);
    await createAdminProduct(productData);
    await updateAdminProduct("product-id", productData);

    expect(mocks.categoryCreate).toHaveBeenCalledWith({ data: categoryData, select: { id: true } });
    expect(mocks.categoryUpdateMany).toHaveBeenCalledWith({ where: { id: "category-id" }, data: categoryData });
    expect(mocks.productCreate).toHaveBeenCalledWith({ data: productData, select: { id: true } });
    expect(mocks.productUpdateMany).toHaveBeenCalledWith({ where: { id: "product-id" }, data: productData });
  });

  it("maps unique slug conflicts to a safe domain error", async () => {
    mocks.productCreate.mockRejectedValue({ code: "P2002", meta: { target: ["slug"] } });

    await expect(createAdminProduct(productData)).rejects.toMatchObject({ code: "SLUG_TAKEN" });
  });

  it("does not delete a category that still owns products", async () => {
    mocks.txCategoryFindUnique.mockResolvedValue({ _count: { products: 2 } });

    await expect(deleteAdminCategory("category-id")).rejects.toMatchObject({ code: "CATEGORY_NOT_EMPTY" });
    expect(mocks.txCategoryDelete).not.toHaveBeenCalled();
  });

  it("deletes an empty category transactionally and a product by id", async () => {
    await deleteAdminCategory("category-id");
    await deleteAdminProduct("product-id");

    expect(mocks.transaction).toHaveBeenCalledWith(expect.any(Function), { isolationLevel: "Serializable" });
    expect(mocks.txCategoryDelete).toHaveBeenCalledWith({ where: { id: "category-id" } });
    expect(mocks.productDeleteMany).toHaveBeenCalledWith({ where: { id: "product-id" } });
  });

  it("stops every write before Prisma when authorization fails", async () => {
    mocks.requireCurrentAdmin.mockRejectedValue(new Error("redirect"));

    await expect(createAdminCategory(categoryData)).rejects.toThrow("redirect");
    await expect(updateAdminProduct("product-id", productData)).rejects.toThrow("redirect");
    await expect(deleteAdminProduct("product-id")).rejects.toThrow("redirect");
    expect(mocks.categoryCreate).not.toHaveBeenCalled();
    expect(mocks.productUpdateMany).not.toHaveBeenCalled();
    expect(mocks.productDeleteMany).not.toHaveBeenCalled();
  });
});
