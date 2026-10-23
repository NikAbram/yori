import type { Metadata } from "next";
import { Suspense } from "react";
import { CartExperience } from "@/components/miniapp/cart-experience";
import { getPublicCatalog } from "@/services/catalog";
import { getPublicSiteSettings } from "@/services/settings";

export const metadata: Metadata = { title: "Корзина", robots: { index: false, follow: false } };
export default function CartPage() {
  return <Suspense fallback={<div className="page-width skeleton" style={{ minHeight: 450, borderRadius: 24 }} role="status" aria-live="polite" aria-busy="true"><span className="visually-hidden">Загружаем корзину</span></div>}><CartContent /></Suspense>;
}

async function CartContent() {
  const [{ products }, settings] = await Promise.all([getPublicCatalog(), getPublicSiteSettings()]);
  return (
    <CartExperience
      products={products}
      pricing={{
        deliveryKopeks: settings.deliveryKopeks,
        freeDeliveryFromKopeks: settings.freeDeliveryFromKopeks,
      }}
    />
  );
}
