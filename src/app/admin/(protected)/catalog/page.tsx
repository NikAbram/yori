import type { Metadata } from "next";
import Link from "next/link";

import { AdminCatalogOverview } from "@/components/admin/admin-catalog-overview";
import { getAdminCatalogOverview } from "@/services/admin-catalog";

export const metadata: Metadata = { title: "Каталог" };
export const instant = false;

const resultMessages: Record<string, string> = {
  "category-saved": "Категория сохранена и каталог обновлён.",
  "category-deleted": "Категория удалена.",
  "product-saved": "Товар сохранён и уже доступен в актуальной версии каталога.",
  "product-deleted": "Товар удалён из каталога.",
};

export default async function AdminCatalogPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ categories, products }, params] = await Promise.all([
    getAdminCatalogOverview(),
    searchParams,
  ]);
  const result = typeof params.result === "string" ? resultMessages[params.result] : undefined;

  return (
    <div className="admin-workspace admin-catalog-page">
      <section className="admin-catalog-title" aria-labelledby="admin-catalog-title">
        <div><p>Редактор меню</p><h1 id="admin-catalog-title">Каталог</h1><span>Публикация, наличие и порядок клиентского меню.</span></div>
        <div className="admin-catalog-totals"><strong>{products.length}</strong><span>товаров</span><small>{categories.length} категорий</small></div>
      </section>
      {result ? <p className="admin-catalog-notice" role="status">{result} <Link href="/catalog">Открыть клиентский каталог</Link></p> : null}
      <AdminCatalogOverview categories={categories} products={products} />
    </div>
  );
}
