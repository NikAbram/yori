import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import { connection } from "next/server";
import { ADMIN_ORDER_PAGE_SIZE, type AdminOrderFilters } from "@/lib/admin-orders-schema";
import { prisma } from "@/lib/db/prisma";
import { requireCurrentAdmin } from "@/services/admin-auth";

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

