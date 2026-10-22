import "server-only";

import type { OrderStatus, Prisma } from "@/generated/prisma/client";
import { connection } from "next/server";
import { ADMIN_ORDER_PAGE_SIZE, type AdminOrderFilters } from "@/lib/admin-orders-schema";
import { prisma } from "@/lib/db/prisma";
import { requireCurrentAdmin } from "@/services/admin-auth";
import { enqueueCustomerOrderNotification, retryNotification } from "@/services/notifications";

export const ADMIN_ORDER_STATUS_TRANSITIONS = {
  NEW: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["COOKING", "CANCELLED"],
  COOKING: ["COURIER", "CANCELLED"],
  COURIER: ["DELIVERED"],
  DELIVERED: [],
  CANCELLED: [],
} as const satisfies Record<OrderStatus, readonly OrderStatus[]>;

const auditStatusLabels: Record<OrderStatus, string> = {
  NEW: "Новый",
  CONFIRMED: "Подтверждён",
  COOKING: "Готовится",
  COURIER: "Передан курьеру",
  DELIVERED: "Доставлен",
  CANCELLED: "Отменён",
};

const auditNotificationOutcomeLabels = {
  missing: "запись не найдена",
  "already-sent": "уже отправлено",
  "attempts-exhausted": "лимит попыток исчерпан",
  "not-claimable": "уже обрабатывается",
  failed: "ошибка доставки",
  sent: "отправлено",
} as const;

type AdminOrderOperationErrorCode =
  | "ORDER_NOT_FOUND"
  | "INVALID_STATUS_TRANSITION"
  | "ORDER_CHANGED"
  | "NOTIFICATION_NOT_FOUND";

export class AdminOrderOperationError extends Error {
  constructor(public readonly code: AdminOrderOperationErrorCode) {
    super(code);
    this.name = "AdminOrderOperationError";
  }
}

const adminOrderListSelect = {
  id: true,
  orderNo: true,
  recipientName: true,
  phone: true,
  totalKopeks: true,
  paymentMethod: true,
  status: true,
  isTest: true,
  createdAt: true,
  items: {
    select: {
      productNameSnapshot: true,
      quantity: true,
    },
  },
} as const;

const adminOrderDetailSelect = {
  id: true,
  orderNo: true,
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
  status: true,
  isTest: true,
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
    orderBy: { createdAt: "desc" as const },
    select: {
      id: true,
      fromStatus: true,
      toStatus: true,
      actorType: true,
      note: true,
      createdAt: true,
      adminUser: { select: { name: true } },
    },
  },
  internalNotes: {
    orderBy: { createdAt: "desc" as const },
    take: 50,
    select: {
      id: true,
      body: true,
      createdAt: true,
      adminUser: { select: { name: true } },
    },
  },
  notifications: {
    orderBy: { createdAt: "desc" as const },
    take: 50,
    select: {
      id: true,
      recipientType: true,
      eventType: true,
      status: true,
      attemptCount: true,
      errorText: true,
      lastAttemptAt: true,
      sentAt: true,
      createdAt: true,
    },
  },
  adminAuditLogs: {
    orderBy: { createdAt: "desc" as const },
    take: 50,
    select: {
      id: true,
      action: true,
      summary: true,
      createdAt: true,
      adminUser: { select: { name: true } },
    },
  },
} satisfies Prisma.OrderSelect;

function startOfUtcDay(value: string) {
  return new Date(`${value}T00:00:00.000Z`);
}
function endOfUtcDay(value: string) {
  return new Date(`${value}T23:59:59.999Z`);
}

function buildOrderWhere(filters: AdminOrderFilters): Prisma.OrderWhereInput {
  const createdAt = filters.from || filters.to
    ? {
        ...(filters.from ? { gte: startOfUtcDay(filters.from) } : {}),
        ...(filters.to ? { lte: endOfUtcDay(filters.to) } : {}),
      }
    : undefined;

  return {
    ...(filters.status ? { status: filters.status } : {}),
    ...(createdAt ? { createdAt } : {}),
    ...(filters.q
      ? {
          OR: [
            { orderNo: { contains: filters.q, mode: "insensitive" } },
            { phone: { contains: filters.q } },
          ],
        }
      : {}),
  };
}

export async function getAdminDashboard(periodDays: number, now?: Date) {
  await requireCurrentAdmin();
  await connection();

  const requestTime = now ?? new Date();
  const periodStart = new Date(requestTime);
  periodStart.setUTCDate(periodStart.getUTCDate() - periodDays + 1);
  periodStart.setUTCHours(0, 0, 0, 0);
  const periodWhere = { createdAt: { gte: periodStart, lte: requestTime } } as const;

  const [orderCount, newOrderCount, deliveredRevenue, testOrderCount, recentOrders] = await Promise.all([
    prisma.order.count({ where: periodWhere }),
    prisma.order.count({ where: { ...periodWhere, status: "NEW" } }),
    prisma.order.aggregate({
      where: { ...periodWhere, status: "DELIVERED", isTest: false },
      _sum: { totalKopeks: true },
    }),
    prisma.order.count({ where: { ...periodWhere, isTest: true } }),
    prisma.order.findMany({
      orderBy: { createdAt: "desc" },
      take: 6,
      select: adminOrderListSelect,
    }),
  ]);

  return {
    periodDays,
    periodStart,
    orderCount,
    newOrderCount,
    testOrderCount,
    deliveredRevenueKopeks: deliveredRevenue._sum.totalKopeks ?? 0,
    recentOrders,
  };
}

export async function listAdminOrders(filters: AdminOrderFilters) {
  await requireCurrentAdmin();
  const where = buildOrderWhere(filters);
  const skip = (filters.page - 1) * ADMIN_ORDER_PAGE_SIZE;

  const [totalCount, orders] = await Promise.all([
    prisma.order.count({ where }),
    prisma.order.findMany({
      where,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip,
      take: ADMIN_ORDER_PAGE_SIZE,
      select: adminOrderListSelect,
    }),
  ]);

  return {
    orders,
    totalCount,
    page: filters.page,
    pageCount: Math.max(1, Math.ceil(totalCount / ADMIN_ORDER_PAGE_SIZE)),
  };
}

export async function getAdminOrderDetail(orderId: string) {
  await requireCurrentAdmin();
  return prisma.order.findUnique({
    where: { id: orderId },
    select: adminOrderDetailSelect,
  });
}

export function getAllowedAdminOrderStatuses(status: OrderStatus): readonly OrderStatus[] {
  return ADMIN_ORDER_STATUS_TRANSITIONS[status];
}

export async function changeAdminOrderStatus(orderId: string, nextStatus: OrderStatus) {
  const admin = await requireCurrentAdmin();

  return prisma.$transaction(async (transaction) => {
    const current = await transaction.order.findUnique({
      where: { id: orderId },
      select: { status: true },
    });
    if (!current) throw new AdminOrderOperationError("ORDER_NOT_FOUND");
    if (!getAllowedAdminOrderStatuses(current.status).includes(nextStatus)) {
      throw new AdminOrderOperationError("INVALID_STATUS_TRANSITION");
    }

    const updated = await transaction.order.updateMany({
      where: { id: orderId, status: current.status },
      data: { status: nextStatus },
    });
    if (updated.count !== 1) throw new AdminOrderOperationError("ORDER_CHANGED");

    const history = await transaction.orderStatusHistory.create({
      data: {
        orderId,
        fromStatus: current.status,
        toStatus: nextStatus,
        actorType: "ADMIN",
        adminUserId: admin.id,
      },
      select: { id: true },
    });
    const notification = await enqueueCustomerOrderNotification(transaction, {
      orderId,
      eventType: nextStatus === "CONFIRMED" ? "ORDER_CONFIRMED" : "ORDER_STATUS_CHANGED",
      deduplicationKey: `status-history:${history.id}`,
    });
    await transaction.adminAuditLog.create({
      data: {
        adminUserId: admin.id,
        orderId,
        action: "ORDER_STATUS_CHANGED",
        summary: `Статус: ${auditStatusLabels[current.status]} → ${auditStatusLabels[nextStatus]}`,
      },
    });

    return { notificationId: notification.id, fromStatus: current.status, toStatus: nextStatus };
  }, { isolationLevel: "Serializable" });
}

export async function addAdminOrderNote(orderId: string, body: string) {
  const admin = await requireCurrentAdmin();
  return prisma.$transaction(async (transaction) => {
    const order = await transaction.order.findUnique({ where: { id: orderId }, select: { id: true } });
    if (!order) throw new AdminOrderOperationError("ORDER_NOT_FOUND");

    const note = await transaction.orderInternalNote.create({
      data: { orderId, adminUserId: admin.id, body },
      select: { id: true },
    });
    await transaction.adminAuditLog.create({
      data: {
        adminUserId: admin.id,
        orderId,
        action: "ORDER_NOTE_ADDED",
        summary: "Добавлена внутренняя заметка",
      },
    });
    return note;
  });
}

export async function retryAdminOrderNotification(orderId: string, notificationId: string) {
  const admin = await requireCurrentAdmin();
  const notification = await prisma.notificationLog.findFirst({
    where: { id: notificationId, orderId },
    select: { id: true },
  });
  if (!notification) throw new AdminOrderOperationError("NOTIFICATION_NOT_FOUND");

  const result = await retryNotification(notification.id);
  await prisma.adminAuditLog.create({
    data: {
      adminUserId: admin.id,
      orderId,
      action: "NOTIFICATION_RETRY_REQUESTED",
      summary: `Ручной повтор уведомления: ${auditNotificationOutcomeLabels[result.outcome]}`,
    },
  });
  return result;
}

