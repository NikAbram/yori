import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { AdminCategoryForm } from "@/components/admin/admin-catalog-forms";
import { adminCatalogIdSchema } from "@/lib/admin-catalog-schema";
import { getAdminCategoryEditor } from "@/services/admin-catalog";

export const metadata: Metadata = { title: "Редактирование категории" };
export const instant = false;

export default async function EditAdminCategoryPage({ params }: { params: Promise<{ id: string }> }) {
  const parsedId = adminCatalogIdSchema.safeParse((await params).id);
  if (!parsedId.success) notFound();
  const category = await getAdminCategoryEditor(parsedId.data);
  if (!category) notFound();

  return (
    <div className="admin-catalog-editor">
      <Link className="admin-back-link" href="/admin/catalog">← Каталог</Link>
      <header><p>Категория</p><h1>{category.name}</h1><span>{category._count.products} товаров используют эту категорию.</span></header>
      <AdminCategoryForm
        entityId={category.id}
        productCount={category._count.products}
        defaults={{
          name: category.name,
          shortName: category.shortName,
          eyebrow: category.eyebrow ?? "",
          slug: category.slug,
          sortOrder: String(category.sortOrder),
          isPublished: category.isPublished,
        }}
      />
    </div>
  );
}
