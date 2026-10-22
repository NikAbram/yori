import type { Metadata } from "next";
import Link from "next/link";

import { AdminCategoryForm } from "@/components/admin/admin-catalog-forms";

export const metadata: Metadata = { title: "Новая категория" };

export default function NewAdminCategoryPage() {
  return (
    <div className="admin-catalog-editor">
      <Link className="admin-back-link" href="/admin/catalog">← Каталог</Link>
      <header><p>Новая запись</p><h1>Категория</h1><span>Сначала задайте структуру, затем наполните её товарами.</span></header>
      <AdminCategoryForm
        entityId={null}
        defaults={{ name: "", shortName: "", eyebrow: "", slug: "", sortOrder: "0", isPublished: true }}
      />
    </div>
  );
}
