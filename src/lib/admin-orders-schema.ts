import { z } from "zod";

import type { OrderStatus } from "@/types/orders";

export const ADMIN_ORDER_PAGE_SIZE = 20;
export const ADMIN_ORDER_STATUSES = [
  "NEW",
  "CONFIRMED",
  "COOKING",
  "COURIER",
  "DELIVERED",
  "CANCELLED",
] as const satisfies readonly OrderStatus[];

const datePattern = /^\d{4}-\d{2}-\d{2}$/;

const optionalDateSchema = z.preprocess(
  (value) => (typeof value === "string" && value.trim() ? value.trim() : undefined),
  z.string().regex(datePattern).optional(),
);

const adminOrderFiltersSchema = z.object({
  q: z.preprocess(
    (value) => (typeof value === "string" ? value.trim() : ""),
    z.string().max(64).catch(""),
  ),
  status: z.preprocess(
    (value) => (value === "ALL" || value === "" ? undefined : value),
    z.enum(ADMIN_ORDER_STATUSES).optional().catch(undefined),
  ),
  from: optionalDateSchema.catch(undefined),
  to: optionalDateSchema.catch(undefined),
  page: z.coerce.number().int().min(1).max(10_000).catch(1),
});

const dashboardPeriodSchema = z.coerce.number().pipe(z.union([
  z.literal(7),
  z.literal(30),
  z.literal(90),
])).catch(30);

export type AdminOrderFilters = {
  q: string;
  status?: OrderStatus;
  from?: string;
  to?: string;
  page: number;
};

export function parseAdminOrderFilters(input: Record<string, string | string[] | undefined>): AdminOrderFilters {
  const parsed = adminOrderFiltersSchema.parse(input);
  if (parsed.from && parsed.to && parsed.from > parsed.to) {
    return { ...parsed, from: parsed.to, to: parsed.from };
  }
  return parsed;
}
export function parseDashboardPeriod(value: string | string[] | undefined) {
  return dashboardPeriodSchema.parse(Array.isArray(value) ? value[0] : value);
}

