import type { Metadata } from "next";
import Link from "next/link";

import { AdminProductForm } from "@/components/admin/admin-catalog-forms";
import { PRODUCT_IMAGE_PATHS } from "@/data/product-images";
import { getAdminProductEditor } from "@/services/admin-catalog";

export const metadata: Metadata = { title: "Новый товар" };
export const instant = false;

export default async function NewAdminProductPage() {
  const { categories } = await getAdminProductEditor();
  if (!categories.length) {
    return <div className="admin-inline-error"><span aria-hidden="true" /><h1>Нужна категория</h1><p>Создайте хотя бы одну категорию перед добавлением товара.</p><Link href="/admin/catalog/categories/new">Создать категорию</Link></div>;
  }

  return (
    <div className="admin-catalog-editor">
      <Link className="admin-back-link" href="/admin/catalog">← Каталог</Link>
      <header><p>Новая запись</p><h1>Товар</h1><span>Цена сохраняется в копейках, изображение выбирается из локальной библиотеки.</span></header>
      <AdminProductForm
        entityId={null}
        categories={categories}
        defaults={{
          categoryId: categories[0].id,
          name: "",
          slug: "",
          description: "",
          ingredientsText: "",
          allergensText: "",
          imagePath: PRODUCT_IMAGE_PATHS[0],
          imageAlt: "",
          weightGrams: "",
          volumeMl: "",
          piecesCount: "",
          priceRubles: "",
          badge: "",
          isAvailable: true,
          isPublished: true,
          isFeatured: false,
          isRecommended: false,
          sortOrder: "0",
        }}
      />
    </div>
  );
}
