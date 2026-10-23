import type { Metadata } from "next";
import { Suspense } from "react";
import { CheckoutExperience } from "@/components/miniapp/checkout-experience";
import { getPublicCatalog } from "@/services/catalog";
import { getOrderAccess } from "@/services/order-access";
import { getCurrentTelegramSession } from "@/services/telegram-auth";
import { getPublicSiteSettings } from "@/services/settings";

export const metadata: Metadata = { title: "Оформление", robots: { index: false, follow: false } };

export default function CheckoutPage() {
  return <Suspense fallback={<div className="page-width skeleton skeleton-checkout" role="status" aria-live="polite" aria-busy="true"><span className="visually-hidden">Загружаем оформление</span></div>}><CheckoutContent /></Suspense>;
}

async function CheckoutContent() {
  const [catalog, session, settings] = await Promise.all([
    getPublicCatalog(),
    getCurrentTelegramSession(),
    getPublicSiteSettings(),
  ]);
  const access = await getOrderAccess(session);
  return (
    <CheckoutExperience
      products={catalog.products}
      access={{
        allowed: access.allowed,
        cashOnDeliveryEnabled: access.cashOnDeliveryEnabled,
        cardOnDeliveryEnabled: access.cardOnDeliveryEnabled,
      }}
      hasTelegramSession={Boolean(session)}
      pricing={{
        deliveryKopeks: settings.deliveryKopeks,
        freeDeliveryFromKopeks: settings.freeDeliveryFromKopeks,
        minimumOrderKopeks: settings.minimumOrderKopeks,
      }}
    />
  );
}
