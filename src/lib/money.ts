export const DELIVERY_KOPEKS = 19_900;
export const FREE_DELIVERY_FROM_KOPEKS = 180_000;

export function formatMoney(kopeks: number) {
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    maximumFractionDigits: 0,
  }).format(Math.round(kopeks / 100));
}

export function deliveryFor(subtotalKopeks: number) {
  if (subtotalKopeks === 0 || subtotalKopeks >= FREE_DELIVERY_FROM_KOPEKS) return 0;
  return DELIVERY_KOPEKS;
}
