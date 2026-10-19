import type { Metadata } from "next";
import { Suspense } from "react";
import { CatalogExperience } from "@/components/miniapp/catalog-experience";

export const metadata: Metadata = { title: "Каталог" };

export default function CatalogPage() {
  return <Suspense fallback={<div className="page-width skeleton" style={{ minHeight: 540, borderRadius: 24 }} aria-label="Загрузка каталога" />}><CatalogExperience /></Suspense>;
}
