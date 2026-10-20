import type { Metadata } from "next";
import { Suspense } from "react";
import { CartExperience } from "@/components/miniapp/cart-experience";
import { getPublicCatalog } from "@/services/catalog";

export const metadata: Metadata = { title: "Корзина", robots: { index: false, follow: false } };
export default function CartPage() {
  return <Suspense fallback={<div className="page-width skeleton" style={{ minHeight: 450, borderRadius: 24 }} role="status" aria-live="polite" aria-busy="true"><span className="visually-hidden">Загружаем корзину</span></div>}><CartContent /></Suspense>;
}

async function CartContent() {
  const { products } = await getPublicCatalog();
  return <CartExperience products={products} />;
}
