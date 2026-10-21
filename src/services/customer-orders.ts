import "server-only";

import { prisma } from "@/lib/db/prisma";

const orderListSelect = {
  id: true,
  orderNo: true,
  status: true,
  totalKopeks: true,
  createdAt: true,
  items: { select: { quantity: true } },
} as const;

const orderDetailSelect = {
  id: true,
  orderNo: true,
  status: true,
  recipientName: true,
  phone: true,
  city: true,
  street: true,
  house: true,
  apartment: true,
  entrance: true,
  floor: true,
  customerNote: true,
  subtotalKopeks: true,
  deliveryKopeks: true,
  discountKopeks: true,
  totalKopeks: true,
  paymentMethod: true,
  createdAt: true,
  updatedAt: true,
  items: {
    orderBy: { id: "asc" as const },
    select: {
      id: true,
      productNameSnapshot: true,
      unitPriceKopeks: true,
      quantity: true,
      lineTotalKopeks: true,
    },
  },
  statusHistory: {
    orderBy: { createdAt: "asc" as const },
    select: {
      id: true,
      fromStatus: true,
      toStatus: true,
      createdAt: true,
    },
  },
} as const;

export async function listCustomerOrders(userId: string) {
  const orders = await prisma.order.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: orderListSelect,
  });

  return orders.map(({ items, ...order }) => ({
    ...order,
    itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
  }));
}

export function getCustomerOrder(userId: string, orderId: string) {
  return prisma.order.findFirst({
    where: { id: orderId, userId },
    select: orderDetailSelect,
  });
}
