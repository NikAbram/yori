import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  orderFindUnique: vi.fn(),
  transaction: vi.fn(),
  consumeRateLimit: vi.fn(),
  priceCart: vi.fn(),
  notificationCreate: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    order: { findUnique: mocks.orderFindUnique },
    $transaction: mocks.transaction,
  },
}));
vi.mock("@/services/checkout-rate-limit", () => ({
  consumeCheckoutRateLimit: mocks.consumeRateLimit,
}));
vi.mock("@/services/cart-pricing", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/services/cart-pricing")>();
  return { ...original, priceCartFromDatabase: mocks.priceCart };
});

import { CartPricingError } from "@/services/cart-pricing";
import { createOrder, OrderingError } from "@/services/ordering";

const input = {
  recipientName: "Анна",
  phone: "+79271234567",
  city: "Самара",
  street: "Ленинградская",
  house: "12",
  apartment: "",
  entrance: "",
  floor: "",
  comment: "",
  consent: true as const,
  items: [{ productId: "9ab96f80-58b8-4c49-8c93-1a6d282d3016", quantity: 2 }],
  paymentMethod: "CASH_ON_DELIVERY" as const,
  idempotencyKey: "99e7fe9f-44dc-4792-a146-27814902392d",
};

const order = {
  id: "order-id",
  orderNo: "YR-ABC1234567",
  status: "NEW",
  subtotalKopeks: 129_800,
  deliveryKopeks: 19_900,
  discountKopeks: 0,
  totalKopeks: 149_700,
  createdAt: new Date("2026-10-20T12:00:00Z"),
};

describe("ordering service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.orderFindUnique.mockResolvedValue(null);
    mocks.consumeRateLimit.mockResolvedValue(undefined);
    mocks.priceCart.mockResolvedValue({
      lines: [{
        productId: input.items[0].productId,
        productName: "Филадельфия",
        unitPriceKopeks: 64_900,
        quantity: 2,
        lineTotalKopeks: 129_800,
      }],
      subtotalKopeks: 129_800,
      deliveryKopeks: 19_900,
      discountKopeks: 0,
      totalKopeks: 149_700,
      cashOnDeliveryEnabled: true,
      cardOnDeliveryEnabled: false,
      managerTelegramChatId: null,
    });
    mocks.notificationCreate.mockResolvedValue({ id: "notification-id" });
  });

  it("creates the order, item snapshots and initial history atomically", async () => {
    const transaction = {
      order: {
        findUnique: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockResolvedValue(order),
      },
      notificationLog: { create: mocks.notificationCreate },
    };
    mocks.transaction.mockImplementation((callback) => callback(transaction));

    const result = await createOrder("user-id", input, { isTest: true });

    expect(result).toEqual({ created: true, order, notificationId: "notification-id" });
    expect(mocks.transaction).toHaveBeenCalledWith(expect.any(Function), {
      isolationLevel: "Serializable",
    });
    const data = transaction.order.create.mock.calls[0][0].data;
    expect(data.subtotalKopeks).toBe(129_800);
    expect(data.totalKopeks).toBe(149_700);
    expect(data.isTest).toBe(true);
    expect(data.items.create).toEqual([expect.objectContaining({
      productNameSnapshot: "Филадельфия",
      unitPriceKopeks: 64_900,
      lineTotalKopeks: 129_800,
    })]);
    expect(data.statusHistory.create).toEqual(expect.objectContaining({
      toStatus: "NEW",
      actorType: "TELEGRAM_USER",
      telegramUserId: "user-id",
    }));
    expect(mocks.notificationCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        orderId: order.id,
        deduplicationKey: `order-created:manager:${input.idempotencyKey}`,
        recipientType: "MANAGER",
        eventType: "ORDER_CREATED",
      }),
      select: { id: true },
    });
  });

  it("returns the existing order for the same idempotency key without another write", async () => {
    mocks.orderFindUnique.mockResolvedValue({ userId: "user-id", ...order });

    await expect(createOrder("user-id", input, { isTest: true })).resolves.toEqual({
      created: false,
      order,
      notificationId: null,
    });
    expect(mocks.consumeRateLimit).not.toHaveBeenCalled();
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("recovers the winning order when concurrent requests collide on the idempotency key", async () => {
    mocks.orderFindUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ userId: "user-id", ...order });
    mocks.transaction.mockRejectedValue({ code: "P2002" });

    await expect(createOrder("user-id", input, { isTest: true })).resolves.toEqual({
      created: false,
      order,
      notificationId: null,
    });
    expect(mocks.transaction).toHaveBeenCalledTimes(1);
    expect(mocks.orderFindUnique).toHaveBeenCalledTimes(2);
  });

  it("retries a serializable transaction conflict and creates only once", async () => {
    const transaction = {
      order: {
        findUnique: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockResolvedValue(order),
      },
      notificationLog: { create: mocks.notificationCreate },
    };
    mocks.transaction
      .mockRejectedValueOnce({ code: "P2034" })
      .mockImplementationOnce((callback) => callback(transaction));

    await expect(createOrder("user-id", input, { isTest: true })).resolves.toEqual({
      created: true,
      order,
      notificationId: "notification-id",
    });
    expect(mocks.transaction).toHaveBeenCalledTimes(2);
    expect(transaction.order.create).toHaveBeenCalledTimes(1);
  });

  it("does not reveal or reuse another user's idempotency key", async () => {
    mocks.orderFindUnique.mockResolvedValue({ userId: "another-user", ...order });

    await expect(createOrder("user-id", input, { isTest: true })).rejects.toBeInstanceOf(OrderingError);
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("rejects a payment method disabled by current settings", async () => {
    const transaction = {
      order: { findUnique: vi.fn().mockResolvedValue(null), create: vi.fn() },
      notificationLog: { create: mocks.notificationCreate },
    };
    mocks.transaction.mockImplementation((callback) => callback(transaction));
    mocks.priceCart.mockResolvedValue({
      lines: [], subtotalKopeks: 70_000, deliveryKopeks: 0, discountKopeks: 0,
      totalKopeks: 70_000, cashOnDeliveryEnabled: false, cardOnDeliveryEnabled: false,
      managerTelegramChatId: null,
    });

    await expect(createOrder("user-id", input, { isTest: true })).rejects.toThrowError(
      expect.objectContaining({ code: "PAYMENT_METHOD_UNAVAILABLE" }),
    );
    expect(transaction.order.create).not.toHaveBeenCalled();
  });

  it("does not write an order when current catalog pricing fails", async () => {
    const transaction = {
      order: { findUnique: vi.fn().mockResolvedValue(null), create: vi.fn() },
      notificationLog: { create: mocks.notificationCreate },
    };
    mocks.transaction.mockImplementation((callback) => callback(transaction));
    mocks.priceCart.mockRejectedValue(new CartPricingError("ITEM_UNAVAILABLE"));

    await expect(createOrder("user-id", input, { isTest: true })).rejects.toThrow("ITEM_UNAVAILABLE");
    expect(transaction.order.create).not.toHaveBeenCalled();
  });

  it("marks a live order as real only when the access policy explicitly allows it", async () => {
    const transaction = {
      order: {
        findUnique: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockResolvedValue(order),
      },
      notificationLog: { create: mocks.notificationCreate },
    };
    mocks.transaction.mockImplementation((callback) => callback(transaction));

    await createOrder("user-id", input, { isTest: false });

    expect(transaction.order.create.mock.calls[0][0].data.isTest).toBe(false);
  });
});
