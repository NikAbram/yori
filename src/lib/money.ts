export const DELIVERY_KOPEKS = 19_900;
export const FREE_DELIVERY_FROM_KOPEKS = 180_000;
export const MIN_ORDER_KOPEKS = 70_000;

export type DeliveryPricing = {
  deliveryKopeks: number;
  freeDeliveryFromKopeks: number | null;
};

export function formatMoney(kopeks: number) {
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    maximumFractionDigits: 0,
  }).format(Math.round(kopeks / 100));
}

export function deliveryFor(
  subtotalKopeks: number,
  pricing: DeliveryPricing = {
    deliveryKopeks: DELIVERY_KOPEKS,
    freeDeliveryFromKopeks: FREE_DELIVERY_FROM_KOPEKS,
  },
) {
  if (
    subtotalKopeks === 0
    || pricing.freeDeliveryFromKopeks !== null && subtotalKopeks >= pricing.freeDeliveryFromKopeks
  ) return 0;
  return pricing.deliveryKopeks;
}
