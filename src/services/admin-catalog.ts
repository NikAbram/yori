import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import type { AdminCategoryData, AdminProductData } from "@/lib/admin-catalog-schema";
import { prisma } from "@/lib/db/prisma";
import { requireCurrentAdmin } from "@/services/admin-auth";

type AdminCatalogErrorCode =
  | "CATEGORY_NOT_FOUND"
  | "PRODUCT_NOT_FOUND"
  | "SLUG_TAKEN"
  | "CATEGORY_NOT_EMPTY"
  | "CATEGORY_REQUIRED";

export class AdminCatalogError extends Error {
  constructor(public readonly code: AdminCatalogErrorCode) {
    super(code);
    this.name = "AdminCatalogError";
  }
}

const categoryOverviewSelect = {
  id: true,
  name: true,
  shortName: true,
  eyebrow: true,
  slug: true,
  sortOrder: true,
  isPublished: true,
  _count: { select: { products: true } },
} satisfies Prisma.CategorySelect;

const productOverviewSelect = {
  id: true,
  categoryId: true,
  name: true,
  slug: true,
  imagePath: true,
  imageAlt: true,
  priceKopeks: true,
  isAvailable: true,
  isPublished: true,
  isFeatured: true,
  isRecommended: true,
  sortOrder: true,
  category: { select: { name: true, slug: true, isPublished: true } },
} satisfies Prisma.ProductSelect;

const productEditorSelect = {
  id: true,
  categoryId: true,
  name: true,
  slug: true,
  description: true,
  ingredients: true,
  allergens: true,
  imagePath: true,
  imageAlt: true,
  weightGrams: true,
  volumeMl: true,
  piecesCount: true,
  priceKopeks: true,
  badge: true,
  isAvailable: true,
  isPublished: true,
  isFeatured: true,
  isRecommended: true,
  sortOrder: true,
} satisfies Prisma.ProductSelect;

const categoryOptionSelect = {
  id: true,
  name: true,
  slug: true,
  isPublished: true,
} satisfies Prisma.CategorySelect;

function hasPrismaCode(error: unknown, code: string) {
  return typeof error === "object" && error !== null && "code" in error && error.code === code;
}

function mapCatalogWriteError(error: unknown): never {
  if (error instanceof AdminCatalogError) throw error;
  if (hasPrismaCode(error, "P2002")) throw new AdminCatalogError("SLUG_TAKEN");
  if (hasPrismaCode(error, "P2003")) throw new AdminCatalogError("CATEGORY_REQUIRED");
  throw error;
}

export async function getAdminCatalogOverview() {
  await requireCurrentAdmin();

  const [categories, products] = await Promise.all([
    prisma.category.findMany({
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: categoryOverviewSelect,
    }),
    prisma.product.findMany({
      orderBy: [
        { category: { sortOrder: "asc" } },
        { sortOrder: "asc" },
        { name: "asc" },
      ],
      select: productOverviewSelect,
    }),
  ]);

  return { categories, products };
}

export async function getAdminCategoryEditor(categoryId: string) {
  await requireCurrentAdmin();
  return prisma.category.findUnique({
    where: { id: categoryId },
    select: categoryOverviewSelect,
  });
}

export async function getAdminProductEditor(productId?: string) {
  await requireCurrentAdmin();

  const [categories, product] = await Promise.all([
    prisma.category.findMany({
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: categoryOptionSelect,
    }),
    productId
      ? prisma.product.findUnique({ where: { id: productId }, select: productEditorSelect })
      : Promise.resolve(null),
  ]);

  return { categories, product };
}

export async function createAdminCategory(data: AdminCategoryData) {
  await requireCurrentAdmin();
  try {
    return await prisma.category.create({ data, select: { id: true } });
  } catch (error) {
    mapCatalogWriteError(error);
  }
}

export async function updateAdminCategory(categoryId: string, data: AdminCategoryData) {
  await requireCurrentAdmin();
  try {
    const result = await prisma.category.updateMany({ where: { id: categoryId }, data });
    if (result.count !== 1) throw new AdminCatalogError("CATEGORY_NOT_FOUND");
  } catch (error) {
    mapCatalogWriteError(error);
  }
}

export async function deleteAdminCategory(categoryId: string) {
  await requireCurrentAdmin();
  try {
    await prisma.$transaction(async (tx) => {
      const category = await tx.category.findUnique({
        where: { id: categoryId },
        select: { _count: { select: { products: true } } },
      });
      if (!category) throw new AdminCatalogError("CATEGORY_NOT_FOUND");
      if (category._count.products > 0) throw new AdminCatalogError("CATEGORY_NOT_EMPTY");
      await tx.category.delete({ where: { id: categoryId } });
    }, { isolationLevel: "Serializable" });
  } catch (error) {
    if (hasPrismaCode(error, "P2003")) throw new AdminCatalogError("CATEGORY_NOT_EMPTY");
    mapCatalogWriteError(error);
  }
}

export async function createAdminProduct(data: AdminProductData) {
  await requireCurrentAdmin();
  try {
    return await prisma.product.create({ data, select: { id: true } });
  } catch (error) {
    mapCatalogWriteError(error);
  }
}

export async function updateAdminProduct(productId: string, data: AdminProductData) {
  await requireCurrentAdmin();
  try {
    const result = await prisma.product.updateMany({ where: { id: productId }, data });
    if (result.count !== 1) throw new AdminCatalogError("PRODUCT_NOT_FOUND");
  } catch (error) {
    mapCatalogWriteError(error);
  }
}

export async function deleteAdminProduct(productId: string) {
  await requireCurrentAdmin();
  const result = await prisma.product.deleteMany({ where: { id: productId } });
  if (result.count !== 1) throw new AdminCatalogError("PRODUCT_NOT_FOUND");
}
