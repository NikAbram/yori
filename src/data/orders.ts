import type { OrderPreview, OrderStatus, OrderStatusStep } from "@/types/orders";

export const orderStatusSteps: OrderStatusStep[] = [
  { status: "NEW", label: "Новый", description: "Заказ создан и ждёт подтверждения." },
  { status: "CONFIRMED", label: "Подтверждён", description: "Команда приняла заказ в работу." },
  { status: "COOKING", label: "Готовится", description: "Блюда собирают на кухне." },
  { status: "COURIER", label: "Передан курьеру", description: "Заказ отправился к получателю." },
  { status: "DELIVERED", label: "Доставлен", description: "Заказ завершён." },
];

export const previewOrder: OrderPreview = {
  id: "preview",
  orderNo: "YŌRI · пример",
  status: "COOKING",
  statusLabel: "Готовится",
  placedAtLabel: "Время появится после оформления",
  items: [
    { productNameSnapshot: "Филадельфия классическая", quantity: 1, unitPriceKopeks: 64_900 },
    { productNameSnapshot: "Маки с огурцом", quantity: 1, unitPriceKopeks: 22_900 },
    { productNameSnapshot: "Морс ягодный", quantity: 1, unitPriceKopeks: 16_900 },
  ],
  subtotalKopeks: 104_700,
  deliveryKopeks: 19_900,
  totalKopeks: 124_600,
};

export function getOrderPreview(id: string) {
  return id === previewOrder.id ? previewOrder : undefined;
}

export function getOrderStatusIndex(status: OrderStatus) {
  if (status === "CANCELLED") return -1;
  return orderStatusSteps.findIndex((step) => step.status === status);
}
