import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  notificationFindUnique: vi.fn(),
  notificationUpdateMany: vi.fn(),
  orderFindUnique: vi.fn(),
  notificationUpsert: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    notificationLog: {
      findUnique: mocks.notificationFindUnique,
      updateMany: mocks.notificationUpdateMany,
    },
  },
}));

import {
  deliverPendingNotification,
  enqueueCustomerOrderNotification,
  MAX_NOTIFICATION_ATTEMPTS,
  NOTIFICATION_CLAIM_TIMEOUT_MS,
  retryNotification,
  retryFailedNotification,
} from "@/services/notifications";

const order = {
  orderNo: "YR-ABC1234567",
  status: "NEW" as const,
  isTest: true,
  totalKopeks: 149_700,
  items: [{
    productNameSnapshot: "Филадельфия",
    quantity: 2,
    lineTotalKopeks: 129_800,
  }],
  user: { telegramId: "123456789", isBlocked: false },
};

const pendingManagerNotification = {
  id: "notification-id",
  recipientType: "MANAGER" as const,
  telegramChatId: "-1001234567890",
  eventType: "ORDER_CREATED" as const,
  status: "PENDING" as const,
  attemptCount: 0,
  lastAttemptAt: null,
  order,
};

describe("notification service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.notificationFindUnique.mockResolvedValue(pendingManagerNotification);
    mocks.notificationUpdateMany.mockResolvedValue({ count: 1 });
  });

  it("sends a safe manager summary and records the successful attempt", async () => {
    const sendMessage = vi.fn().mockResolvedValue(undefined);
    const now = new Date("2026-10-22T10:00:00Z");

    await expect(deliverPendingNotification("notification-id", {
      sendMessage,
      now: () => now,
    })).resolves.toEqual({ outcome: "sent", attemptCount: 1 });

    expect(sendMessage).toHaveBeenCalledWith(
      "-1001234567890",
      expect.stringMatching(/Тестовый заказ[\s\S]*YR-ABC1234567[\s\S]*Филадельфия × 2[\s\S]*1\s497\s₽/u),
    );
    expect(mocks.notificationUpdateMany).toHaveBeenNthCalledWith(1, {
      where: {
        id: "notification-id",
        status: "PENDING",
        attemptCount: 0,
        lastAttemptAt: null,
      },
      data: {
        status: "PENDING",
        attemptCount: { increment: 1 },
        lastAttemptAt: now,
        errorText: null,
      },
    });
    expect(mocks.notificationUpdateMany).toHaveBeenNthCalledWith(2, {
      where: { id: "notification-id", status: "PENDING", attemptCount: 1 },
      data: {
        status: "SENT",
        errorText: null,
        sentAt: now,
        telegramChatId: "-1001234567890",
      },
    });
  });

  it("stores only a sanitized failure and leaves the order untouched", async () => {
    const sendMessage = vi.fn().mockRejectedValue(
      Object.assign(new Error("token=secret-value and full Telegram response"), { error_code: 403 }),
    );

    await expect(deliverPendingNotification("notification-id", { sendMessage }))
      .resolves.toEqual({
        outcome: "failed",
        errorText: "telegram_forbidden",
        attemptCount: 1,
      });

    const failureWrite = mocks.notificationUpdateMany.mock.calls[1][0];
    expect(failureWrite.data).toEqual(expect.objectContaining({
      status: "FAILED",
      errorText: "telegram_forbidden",
      sentAt: null,
    }));
    expect(JSON.stringify(failureWrite)).not.toContain("secret-value");
  });

  it("allows an explicit failed retry but caps the total number of attempts", async () => {
    mocks.notificationFindUnique.mockResolvedValue({
      ...pendingManagerNotification,
      status: "FAILED",
      attemptCount: 2,
    });
    const sendMessage = vi.fn().mockResolvedValue(undefined);

    await expect(retryFailedNotification("notification-id", { sendMessage }))
      .resolves.toEqual({ outcome: "sent", attemptCount: 3 });
    expect(mocks.notificationUpdateMany).toHaveBeenNthCalledWith(1, expect.objectContaining({
      where: expect.objectContaining({
        id: "notification-id",
        status: "FAILED",
        attemptCount: 2,
      }),
    }));

    mocks.notificationFindUnique.mockResolvedValue({
      ...pendingManagerNotification,
      status: "FAILED",
      attemptCount: MAX_NOTIFICATION_ATTEMPTS,
    });
    await expect(retryFailedNotification("notification-id", { sendMessage }))
      .resolves.toEqual({ outcome: "attempts-exhausted" });
  });

  it("recovers an unstarted or stale pending delivery without racing a fresh claim", async () => {
    const now = new Date("2026-10-22T12:00:00Z");
    const sendMessage = vi.fn().mockResolvedValue(undefined);

    await expect(retryNotification("notification-id", { sendMessage, now: () => now }))
      .resolves.toEqual({ outcome: "sent", attemptCount: 1 });

    mocks.notificationFindUnique.mockResolvedValue({
      ...pendingManagerNotification,
      attemptCount: 1,
      lastAttemptAt: new Date(now.getTime() - NOTIFICATION_CLAIM_TIMEOUT_MS + 1),
    });
    await expect(retryNotification("notification-id", { sendMessage, now: () => now }))
      .resolves.toEqual({ outcome: "not-claimable" });

    mocks.notificationFindUnique.mockResolvedValue({
      ...pendingManagerNotification,
      attemptCount: 1,
      lastAttemptAt: new Date(now.getTime() - NOTIFICATION_CLAIM_TIMEOUT_MS),
    });
    await expect(retryNotification("notification-id", { sendMessage, now: () => now }))
      .resolves.toEqual({ outcome: "sent", attemptCount: 2 });
  });

  it("does not report delivery as stored when the result compare-and-set loses", async () => {
    mocks.notificationUpdateMany
      .mockResolvedValueOnce({ count: 1 })
      .mockResolvedValueOnce({ count: 0 });

    await expect(deliverPendingNotification("notification-id", {
      sendMessage: vi.fn().mockResolvedValue(undefined),
    })).rejects.toThrow("result_persistence_conflict");
  });

  it("does not send when another invocation wins the atomic claim", async () => {
    mocks.notificationUpdateMany.mockResolvedValueOnce({ count: 0 });
    const sendMessage = vi.fn();

    await expect(deliverPendingNotification("notification-id", { sendMessage }))
      .resolves.toEqual({ outcome: "not-claimable" });
    expect(sendMessage).not.toHaveBeenCalled();
  });

  it("queues customer events with a lossless Telegram chat ID", async () => {
    mocks.orderFindUnique.mockResolvedValue({
      user: { telegramId: "9007199254740993123", isBlocked: false },
    });
    mocks.notificationUpsert.mockResolvedValue({ id: "customer-notification" });
    const database = {
      order: { findUnique: mocks.orderFindUnique },
      notificationLog: { upsert: mocks.notificationUpsert },
    } as never;

    await expect(enqueueCustomerOrderNotification(database, {
      orderId: "order-id",
      eventType: "ORDER_STATUS_CHANGED",
      deduplicationKey: "status-history:history-id",
    })).resolves.toEqual({ id: "customer-notification" });

    expect(mocks.notificationUpsert).toHaveBeenCalledWith({
      where: { deduplicationKey: "status-history:history-id" },
      create: expect.objectContaining({
        orderId: "order-id",
        recipientType: "CUSTOMER",
        telegramChatId: "9007199254740993123",
        eventType: "ORDER_STATUS_CHANGED",
      }),
      update: {},
      select: { id: true },
    });
  });

  it("sends a customer status update only to an eligible Telegram user", async () => {
    mocks.notificationFindUnique.mockResolvedValue({
      ...pendingManagerNotification,
      recipientType: "CUSTOMER",
      telegramChatId: "123456789",
      eventType: "ORDER_STATUS_CHANGED",
      order: { ...order, status: "COOKING" },
    });
    const sendMessage = vi.fn().mockResolvedValue(undefined);

    await expect(deliverPendingNotification("notification-id", { sendMessage }))
      .resolves.toEqual({ outcome: "sent", attemptCount: 1 });
    expect(sendMessage).toHaveBeenCalledWith(
      "123456789",
      "Статус заказа YR-ABC1234567: Готовится.",
    );
  });

  it("does not message a customer blocked after the event was queued", async () => {
    mocks.notificationFindUnique.mockResolvedValue({
      ...pendingManagerNotification,
      recipientType: "CUSTOMER",
      telegramChatId: "123456789",
      eventType: "ORDER_STATUS_CHANGED",
      order: { ...order, user: { ...order.user, isBlocked: true } },
    });
    const sendMessage = vi.fn();

    await expect(deliverPendingNotification("notification-id", { sendMessage }))
      .resolves.toEqual({
        outcome: "failed",
        errorText: "recipient_unavailable",
        attemptCount: 1,
      });
    expect(sendMessage).not.toHaveBeenCalled();
  });

  it("records an unavailable recipient instead of silently dropping the event", async () => {
    mocks.notificationFindUnique.mockResolvedValue({
      ...pendingManagerNotification,
      telegramChatId: null,
    });

    await expect(deliverPendingNotification("notification-id", {
      environment: {},
      sendMessage: vi.fn(),
    })).resolves.toEqual({
      outcome: "failed",
      errorText: "recipient_unavailable",
      attemptCount: 1,
    });
  });
});
