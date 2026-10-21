import type { OrderStatus, OrderStatusStep } from "@/types/orders";

export const orderStatusSteps: OrderStatusStep[] = [
  { status: "NEW", label: "Новый", description: "Заказ создан и ждёт подтверждения." },
  { status: "CONFIRMED", label: "Подтверждён", description: "Команда приняла заказ в работу." },
  { status: "COOKING", label: "Готовится", description: "Блюда собирают на кухне." },
  { status: "COURIER", label: "Передан курьеру", description: "Заказ отправился к получателю." },
  { status: "DELIVERED", label: "Доставлен", description: "Заказ завершён." },
];

export const orderStatusLabels: Record<OrderStatus, string> = {
  NEW: "Новый",
  CONFIRMED: "Подтверждён",
  COOKING: "Готовится",
  COURIER: "Передан курьеру",
  DELIVERED: "Доставлен",
  CANCELLED: "Отменён",
};

export function getOrderStatusIndex(status: OrderStatus) {
  if (status === "CANCELLED") return -1;
  return orderStatusSteps.findIndex((step) => step.status === status);
}
