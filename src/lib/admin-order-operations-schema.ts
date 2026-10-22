import { z } from "zod";

import { ADMIN_ORDER_STATUSES } from "@/lib/admin-orders-schema";

export const adminOrderIdSchema = z.uuid();

export const changeOrderStatusSchema = z.object({
  orderId: adminOrderIdSchema,
  status: z.enum(ADMIN_ORDER_STATUSES),
});
export const addOrderNoteSchema = z.object({
  orderId: adminOrderIdSchema,
  body: z.string().trim().min(1, "Введите текст заметки.").max(1000, "Заметка не должна превышать 1000 символов."),
});

export const retryOrderNotificationSchema = z.object({
  orderId: adminOrderIdSchema,
  notificationId: z.uuid(),
});

