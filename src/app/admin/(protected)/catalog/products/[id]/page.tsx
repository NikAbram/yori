import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { AdminProductForm } from "@/components/admin/admin-catalog-forms";
import { isProductImagePath, PRODUCT_IMAGE_PATHS } from "@/data/product-images";
import { adminCatalogIdSchema } from "@/lib/admin-catalog-schema";
import { getAdminProductEditor } from "@/services/admin-catalog";

export const metadata: Metadata = { title: "Редактирование товара" };
export const instant = false;

function priceInput(kopeks: number) {
  const rubles = Math.floor(kopeks / 100);
  const remainder = kopeks % 100;
  return remainder ? `${rubles},${String(remainder).padStart(2, "0")}` : String(rubles);
}

export default async function EditAdminProductPage({ params }: { params: Promise<{ id: string }> }) {
  const parsedId = adminCatalogIdSchema.safeParse((await params).id);
  if (!parsedId.success) notFound();
  const { categories, product } = await getAdminProductEditor(parsedId.data);
  if (!product) notFound();

  return (
    <div className="admin-catalog-editor">
      <Link className="admin-back-link" href="/admin/catalog">← Каталог</Link>
      <header><p>Товар</p><h1>{product.name}</h1><span>Изменения публикации и наличия сразу инвалидируют клиентский каталог.</span></header>
      <AdminProductForm
        entityId={product.id}
        categories={categories}
        defaults={{
          categoryId: product.categoryId,
          name: product.name,
          slug: product.slug,
          description: product.description,
          ingredientsText: product.ingredients.join("\n"),
          allergensText: product.allergens.join("\n"),
          imagePath: isProductImagePath(product.imagePath) ? product.imagePath : PRODUCT_IMAGE_PATHS[0],
          imageAlt: product.imageAlt,
          weightGrams: product.weightGrams === null ? "" : String(product.weightGrams),
          volumeMl: product.volumeMl === null ? "" : String(product.volumeMl),
          piecesCount: product.piecesCount === null ? "" : String(product.piecesCount),
          priceRubles: priceInput(product.priceKopeks),
          badge: product.badge ?? "",
          isAvailable: product.isAvailable,
          isPublished: product.isPublished,
          isFeatured: product.isFeatured,
          isRecommended: product.isRecommended,
          sortOrder: String(product.sortOrder),
        }}
      />
    </div>
  );
}
