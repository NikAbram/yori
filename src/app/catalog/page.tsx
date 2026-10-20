import type { Metadata } from "next";
import { Suspense } from "react";
import { CatalogExperience } from "@/components/miniapp/catalog-experience";
import { getPublicCatalog } from "@/services/catalog";

export const metadata: Metadata = { title: "Каталог" };

export default function CatalogPage() {
  return <Suspense fallback={<div className="page-width skeleton" style={{ minHeight: 540, borderRadius: 24 }} role="status" aria-live="polite" aria-busy="true"><span className="visually-hidden">Загружаем каталог</span></div>}><CatalogContent /></Suspense>;
}

async function CatalogContent() {
  const catalog = await getPublicCatalog();
  return <CatalogExperience {...catalog} />;
}
