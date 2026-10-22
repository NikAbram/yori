import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db/prisma";
import { formatMoney } from "@/lib/money";
import { getOptionalTelegramManagerChatId } from "@/lib/telegram/bot-config";
import { initializeYoriTelegramBot } from "@/services/telegram-bot";

export const MAX_NOTIFICATION_ATTEMPTS = 3;

type CustomerNotificationEvent = "ORDER_CONFIRMED" | "ORDER_STATUS_CHANGED";
type DeliveryMode = "initial" | "manual-retry";

type NotificationDatabase = Pick<Prisma.TransactionClient, "notificationLog" | "order">;
type SendTelegramMessage = (chatId: string, text: string) => Promise<unknown>;

const notificationSelect = {
  id: true,
  recipientType: true,
  telegramChatId: true,
  eventType: true,
  status: true,
  attemptCount: true,
  order: {
    select: {
      orderNo: true,
      status: true,
      isTest: true,
      totalKopeks: true,
      items: {
        orderBy: { productNameSnapshot: "asc" as const },
        select: {
          productNameSnapshot: true,
          quantity: true,
          lineTotalKopeks: true,
        },
      },
      user: {
        select: {
          telegramId: true,
          isBlocked: true,
        },
      },
    },
  },
} satisfies Prisma.NotificationLogSelect;

const statusLabels = {
  NEW: "Новый",
  CONFIRMED: "Подтверждён",
  COOKING: "Готовится",
  COURIER: "Передан курьеру",
  DELIVERED: "Доставлен",
  CANCELLED: "Отменён",
} as const;

class NotificationDeliveryError extends Error {
  constructor(public readonly safeCode: string) {
    super(safeCode);
    this.name = "NotificationDeliveryError";
  }
}

function assertDeduplicationKey(value: string) {
  if (!value || value.length > 160 || !/^[A-Za-z0-9:_-]+$/.test(value)) {
    throw new TypeError("Notification deduplication key is invalid.");
  }
}

function buildNotificationText(
  notification: Prisma.NotificationLogGetPayload<{ select: typeof notificationSelect }>,
) {
  const order = notification.order;
  if (!order) throw new NotificationDeliveryError("order_unavailable");

  if (notification.recipientType === "MANAGER") {
    if (notification.eventType !== "ORDER_CREATED") {
      throw new NotificationDeliveryError("event_recipient_mismatch");
    }

    const heading = order.isTest ? "Тестовый заказ" : "Новый заказ";
    const items = order.items.map((item) => (
      `• ${item.productNameSnapshot} × ${item.quantity} — ${formatMoney(item.lineTotalKopeks)}`
    ));

    return [
      heading,
      `Заказ ${order.orderNo}`,
      "",
      "Состав:",
      ...items,
      "",
      `Итого: ${formatMoney(order.totalKopeks)}`,
      `Статус: ${statusLabels[order.status]}`,
    ].join("\n");
  }

  if (notification.eventType === "ORDER_CONFIRMED") {
    return `Заказ ${order.orderNo} подтверждён. Актуальный статус доступен в разделе «Заказы».`;
  }
  if (notification.eventType === "ORDER_STATUS_CHANGED") {
    return `Статус заказа ${order.orderNo}: ${statusLabels[order.status]}.`;
  }

  throw new NotificationDeliveryError("event_recipient_mismatch");
}

function resolveTelegramChatId(
  notification: Prisma.NotificationLogGetPayload<{ select: typeof notificationSelect }>,
  environment: Record<string, string | undefined>,
) {
  if (notification.recipientType === "MANAGER") {
    return notification.telegramChatId ?? getOptionalTelegramManagerChatId(environment);
  }
  if (notification.order?.user.isBlocked) return null;
  return notification.telegramChatId ?? notification.order?.user.telegramId ?? null;
}

function sanitizeDeliveryError(error: unknown) {
  if (error instanceof NotificationDeliveryError) return error.safeCode;

  if (typeof error === "object" && error !== null && "error_code" in error) {
    const code = error.error_code;
    if (code === 403) return "telegram_forbidden";
    if (code === 429) return "telegram_rate_limited";
    if (code === 400) return "telegram_request_rejected";
  }

  return "telegram_delivery_failed";
}

async function sendWithConfiguredBot(chatId: string, text: string) {
  const initialized = initializeYoriTelegramBot();
  if (!initialized.configured) {
    throw new NotificationDeliveryError("configuration_unavailable");
  }

  await initialized.bot.api.sendMessage(chatId, text, {
    link_preview_options: { is_disabled: true },
  });
}

async function deliverNotification(
  notificationId: string,
  mode: DeliveryMode,
  dependencies: {
    environment?: Record<string, string | undefined>;
    now?: () => Date;
    sendMessage?: SendTelegramMessage;
  } = {},
) {
  const notification = await prisma.notificationLog.findUnique({
    where: { id: notificationId },
    select: notificationSelect,
  });
  if (!notification) return { outcome: "missing" as const };
  if (notification.status === "SENT") return { outcome: "already-sent" as const };
  if (notification.attemptCount >= MAX_NOTIFICATION_ATTEMPTS) {
    return { outcome: "attempts-exhausted" as const };
  }

  const expectedStatus = mode === "initial" ? "PENDING" : "FAILED";
  if (notification.status !== expectedStatus) return { outcome: "not-claimable" as const };
  if (mode === "initial" && notification.attemptCount !== 0) {
    return { outcome: "not-claimable" as const };
  }

  const now = dependencies.now?.() ?? new Date();
  const claimed = await prisma.notificationLog.updateMany({
    where: {
      id: notification.id,
      status: expectedStatus,
      attemptCount: notification.attemptCount,
    },
    data: {
      status: "PENDING",
      attemptCount: { increment: 1 },
      lastAttemptAt: now,
      errorText: null,
    },
  });
  if (claimed.count !== 1) return { outcome: "not-claimable" as const };

  const environment = dependencies.environment ?? process.env;
  const chatId = resolveTelegramChatId(notification, environment);
  const attemptCount = notification.attemptCount + 1;

  try {
    if (!chatId) throw new NotificationDeliveryError("recipient_unavailable");
    const text = buildNotificationText(notification);
    await (dependencies.sendMessage ?? sendWithConfiguredBot)(chatId, text);
  } catch (error) {
    const errorText = sanitizeDeliveryError(error);
    await prisma.notificationLog.updateMany({
      where: { id: notification.id, status: "PENDING", attemptCount },
      data: { status: "FAILED", errorText, sentAt: null, telegramChatId: chatId },
    });
    return { outcome: "failed" as const, errorText, attemptCount };
  }

  await prisma.notificationLog.updateMany({
    where: { id: notification.id, status: "PENDING", attemptCount },
    data: { status: "SENT", errorText: null, sentAt: now, telegramChatId: chatId },
  });
  return { outcome: "sent" as const, attemptCount };
}

export function deliverPendingNotification(
  notificationId: string,
  dependencies?: Parameters<typeof deliverNotification>[2],
) {
  return deliverNotification(notificationId, "initial", dependencies);
}

export function retryFailedNotification(
  notificationId: string,
  dependencies?: Parameters<typeof deliverNotification>[2],
) {
  return deliverNotification(notificationId, "manual-retry", dependencies);
}

export async function enqueueCustomerOrderNotification(
  database: NotificationDatabase,
  input: {
    orderId: string;
    eventType: CustomerNotificationEvent;
    deduplicationKey: string;
  },
) {
  assertDeduplicationKey(input.deduplicationKey);

  const order = await database.order.findUnique({
    where: { id: input.orderId },
    select: { user: { select: { telegramId: true, isBlocked: true } } },
  });
  if (!order) throw new NotificationDeliveryError("order_unavailable");

  return database.notificationLog.upsert({
    where: { deduplicationKey: input.deduplicationKey },
    create: {
      orderId: input.orderId,
      deduplicationKey: input.deduplicationKey,
      recipientType: "CUSTOMER",
      telegramChatId: order.user.isBlocked ? null : order.user.telegramId,
      eventType: input.eventType,
    },
    update: {},
    select: { id: true },
  });
}
