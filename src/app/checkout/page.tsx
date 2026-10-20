import type { Metadata } from "next";
import { Suspense } from "react";
import { CheckoutExperience } from "@/components/miniapp/checkout-experience";
import { getPublicCatalog } from "@/services/catalog";

export const metadata: Metadata = { title: "Оформление", robots: { index: false, follow: false } };

export default function CheckoutPage() {
  return <Suspense fallback={<div className="page-width skeleton skeleton-checkout" role="status" aria-live="polite" aria-busy="true"><span className="visually-hidden">Загружаем оформление</span></div>}><CheckoutContent /></Suspense>;
}

async function CheckoutContent() {
  const { products } = await getPublicCatalog();
  return <CheckoutExperience products={products} />;
}
