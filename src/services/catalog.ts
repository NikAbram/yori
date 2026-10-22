import "server-only";

import { cacheLife, cacheTag, revalidateTag, updateTag } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import type { Category, Product, PublicCatalog } from "@/types/catalog";

export const CATALOG_CACHE_TAG = "catalog";

const categorySelect = {
  slug: true,
  name: true,
  shortName: true,
  eyebrow: true,
} as const;

const productSelect = {
  id: true,
  slug: true,
  name: true,
  description: true,
  ingredients: true,
  allergens: true,
  imagePath: true,
  imageAlt: true,
  priceKopeks: true,
  weightGrams: true,
  volumeMl: true,
  piecesCount: true,
  badge: true,
  isAvailable: true,
  isFeatured: true,
  isRecommended: true,
  sortOrder: true,
  category: { select: { slug: true } },
} as const;

type CategoryRow = {
  slug: string;
  name: string;
  shortName: string;
  eyebrow: string | null;
};

type ProductRow = {
  id: string;
  slug: string;
  name: string;
  description: string;
  ingredients: string[];
  allergens: string[];
  imagePath: string;
  imageAlt: string;
  priceKopeks: number;
  weightGrams: number | null;
  volumeMl: number | null;
  piecesCount: number | null;
  badge: string | null;
  isAvailable: boolean;
  isFeatured: boolean;
  isRecommended: boolean;
  sortOrder: number;
  category: { slug: string };
};

function toPublicCategory(category: CategoryRow): Category {
  return {
    slug: category.slug,
    name: category.name,
    shortName: category.shortName,
    eyebrow: category.eyebrow ?? "",
  };
}

function toPublicProduct(product: ProductRow): Product {
  return {
    id: product.id,
    slug: product.slug,
    category: product.category.slug,
    name: product.name,
    description: product.description,
    ingredients: product.ingredients,
    allergens: product.allergens,
    image: product.imagePath,
    imageAlt: product.imageAlt,
    priceKopeks: product.priceKopeks,
    weightGrams: product.weightGrams ?? undefined,
    volumeMl: product.volumeMl ?? undefined,
    piecesCount: product.piecesCount ?? undefined,
    badge: product.badge ?? undefined,
    isAvailable: product.isAvailable,
    isFeatured: product.isFeatured,
    isRecommended: product.isRecommended,
    sortOrder: product.sortOrder,
  };
}

export async function getPublicCatalog(): Promise<PublicCatalog> {
  "use cache";
  cacheLife("hours");
  cacheTag(CATALOG_CACHE_TAG);

  const [categoryRows, productRows] = await Promise.all([
    prisma.category.findMany({
      where: { isPublished: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: categorySelect,
    }),
    prisma.product.findMany({
      where: {
        isPublished: true,
        category: { isPublished: true },
      },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: productSelect,
    }),
  ]);

  return {
    categories: categoryRows.map(toPublicCategory),
    products: productRows.map(toPublicProduct),
  };
}

export async function getPublicProductBySlug(slug: string) {
  "use cache";
  cacheLife("hours");
  cacheTag(CATALOG_CACHE_TAG, `${CATALOG_CACHE_TAG}:product:${slug}`);

  const product = await prisma.product.findFirst({
    where: {
      slug,
      isPublished: true,
      category: { isPublished: true },
    },
    select: {
      ...productSelect,
      category: { select: { slug: true, name: true } },
    },
  });

  if (!product) return null;

  return {
    product: toPublicProduct(product),
    categoryName: product.category.name,
  };
}

export function revalidatePublicCatalog() {
  revalidateTag(CATALOG_CACHE_TAG, "max");
}

// Call from a Server Action after a CRM mutation when the next read must be fresh.
export function expirePublicCatalogCache() {
  updateTag(CATALOG_CACHE_TAG);
}
