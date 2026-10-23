import type { Metadata } from "next";
import { Truck } from "lucide-react";
import { InfoPage } from "@/components/miniapp/info-page";
import { formatMoney } from "@/lib/money";
import { getPublicSiteSettings } from "@/services/settings";

export const metadata: Metadata = { title: "Доставка" };

export default async function DeliveryPage() {
  const settings = await getPublicSiteSettings();
  const freeDelivery = settings.freeDeliveryFromKopeks === null
    ? "Бесплатная доставка сейчас не настроена."
    : `Бесплатно от ${formatMoney(settings.freeDeliveryFromKopeks)}.`;
  const sections = [
    { title: settings.isPublicOrderingOpen ? "Приём заказов открыт" : "Приём заказов закрыт", body: settings.isPublicOrderingOpen ? "Доступность конкретного способа оплаты и итог сервер проверит перед оформлением." : "Сейчас можно изучать меню и собирать корзину. Оформление доступно только в разрешённом режиме." },
    { title: "Зоны и условия", body: settings.deliveryTerms ?? "Подтверждённые города, районы и границы доставки ещё не опубликованы." },
    { title: "Стоимость", body: `Минимальный заказ — ${formatMoney(settings.minimumOrderKopeks)}. Доставка — ${formatMoney(settings.deliveryKopeks)}. ${freeDelivery}` },
    { title: "Оплата", body: settings.cashOnDeliveryEnabled || settings.cardOnDeliveryEnabled ? [settings.cashOnDeliveryEnabled ? "наличными при получении" : null, settings.cardOnDeliveryEnabled ? "картой при получении" : null].filter(Boolean).join("; ") : "Доступные способы оплаты пока не опубликованы." },
  ];
  return <InfoPage icon={Truck} kicker="Условия" title="Доставка без догадок" intro="Здесь публикуются только подтверждённые зоны, стоимость и доступные способы получения." sections={sections} />;
}
