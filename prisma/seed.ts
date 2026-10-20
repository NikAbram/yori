import "dotenv/config";

import { PrismaClient } from "../src/generated/prisma/client";
import { categories, products } from "../src/data/products";
import { createNeonHttpAdapter } from "../src/lib/db/neon-http-adapter";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required to seed the database.");
}

const prisma = new PrismaClient({
  adapter: createNeonHttpAdapter(databaseUrl),
});

async function seed() {
  const categoryData = categories.map((category, sortOrder) => ({
    name: category.name,
    shortName: category.shortName,
    eyebrow: category.eyebrow,
    slug: category.slug,
    sortOrder: sortOrder + 1,
    isPublished: true,
  }));

  await prisma.category.createMany({
    data: categoryData,
    skipDuplicates: true,
  });

  for (const category of categoryData) {
    await prisma.category.update({
      where: { slug: category.slug },
      data: category,
    });
  }

  const persistedCategories = await prisma.category.findMany({
    select: { id: true, slug: true },
  });
  const categoryIds = new Map(
    persistedCategories.map(({ id, slug }) => [slug, id]),
  );

  const productData = products.map((product) => {
    const categoryId = categoryIds.get(product.category);

    if (!categoryId) {
      throw new Error(`Seed category is missing for product ${product.slug}.`);
    }

    return {
      categoryId,
      slug: product.slug,
      name: product.name,
      description: product.description,
      ingredients: product.ingredients,
      allergens: product.allergens,
      imagePath: product.image,
      imageAlt: product.imageAlt,
      weightGrams: product.weightGrams ?? null,
      volumeMl: product.volumeMl ?? null,
      piecesCount: product.piecesCount ?? null,
      priceKopeks: product.priceKopeks,
      badge: product.badge ?? null,
      isAvailable: product.isAvailable,
      isPublished: true,
      isFeatured: product.isFeatured,
      isRecommended: product.isRecommended,
      sortOrder: product.sortOrder,
    };
  });

  await prisma.product.createMany({
    data: productData,
    skipDuplicates: true,
  });

  for (const product of productData) {
    await prisma.product.update({
      where: { slug: product.slug },
      data: product,
    });
  }

  await prisma.siteSettings.createMany({
    data: [{ id: "default" }],
    skipDuplicates: true,
  });

  const [categoryCount, productCount] = await Promise.all([
    prisma.category.count(),
    prisma.product.count(),
  ]);

  console.info(`Seed complete: ${categoryCount} categories, ${productCount} products.`);
}

seed()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : "Database seed failed.");
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
