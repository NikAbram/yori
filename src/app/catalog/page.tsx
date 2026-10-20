import type { Metadata } from "next";
import { Suspense } from "react";
import { CatalogExperience } from "@/components/miniapp/catalog-experience";

export const metadata: Metadata = { title: "Каталог" };

export default function CatalogPage() {
  return <Suspense fallback={<div className="page-width skeleton" style={{ minHeight: 540, borderRadius: 24 }} role="status" aria-live="polite" aria-busy="true"><span className="visually-hidden">Загружаем каталог</span></div>}><CatalogExperience /></Suspense>;
}
