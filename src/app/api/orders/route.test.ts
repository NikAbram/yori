import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  getOrderAccess: vi.fn(),
  listOrders: vi.fn(),
  createOrder: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/services/telegram-auth", () => ({
  getCurrentTelegramSession: mocks.getSession,
}));
vi.mock("@/services/order-access", () => ({
  getOrderAccess: mocks.getOrderAccess,
}));
vi.mock("@/services/customer-orders", () => ({
  listCustomerOrders: mocks.listOrders,
}));
vi.mock("@/services/ordering", () => {
  class OrderingError extends Error {
    constructor(public readonly code: string) {
      super(code);
    }
  }
  return { createOrder: mocks.createOrder, OrderingError };
});
vi.mock("@/services/cart-pricing", () => {
  class CartPricingError extends Error {
    constructor(public readonly code: string, public readonly details?: object) {
      super(code);
    }
  }
  return { CartPricingError };
});
vi.mock("@/services/checkout-rate-limit", () => {
  class CheckoutRateLimitError extends Error {
    constructor(public readonly retryAfterSeconds: number) {
      super("CHECKOUT_RATE_LIMITED");
    }
  }
  return { CheckoutRateLimitError };
});

import { GET, POST } from "@/app/api/orders/route";

const requestBody = {
  recipientName: "Анна",
  phone: "+7 927 123-45-67",
  city: "Самара",
  street: "Ленинградская",
  house: "12",
  apartment: "",
  entrance: "",
  floor: "",
  comment: "",
  consent: true,
  items: [{ productId: "9ab96f80-58b8-4c49-8c93-1a6d282d3016", quantity: 2 }],
  paymentMethod: "CASH_ON_DELIVERY",
  idempotencyKey: "99e7fe9f-44dc-4792-a146-27814902392d",
};

function orderRequest(body: unknown = requestBody, origin = "https://yori.test") {
  return new Request("https://yori.test/api/orders", {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: origin },
    body: JSON.stringify(body),
  });
}

describe("order route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getSession.mockResolvedValue({ userId: "user-id", telegramId: "42", allowPrivateTest: true });
    mocks.getOrderAccess.mockResolvedValue({ allowed: true, isTest: true });
    mocks.listOrders.mockResolvedValue([]);
    mocks.createOrder.mockResolvedValue({
      created: true,
      order: { id: "order-id", orderNo: "YR-ABC1234567", totalKopeks: 149_700 },
    });
  });

  it("requires a verified Telegram session", async () => {
    mocks.getSession.mockResolvedValue(null);

    const response = await POST(orderRequest());

    expect(response.status).toBe(401);
    expect(mocks.createOrder).not.toHaveBeenCalled();
  });

  it("returns only the authenticated user's private order list", async () => {
    mocks.listOrders.mockResolvedValue([{ id: "order-id", orderNo: "YR-123" }]);

    const response = await GET();

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store, private");
    expect(mocks.listOrders).toHaveBeenCalledWith("user-id");
  });

  it("fails closed for a user not enabled for private testing", async () => {
    mocks.getOrderAccess.mockResolvedValue({ allowed: false, isTest: true });

    const response = await POST(orderRequest());

    expect(response.status).toBe(409);
    expect(mocks.createOrder).not.toHaveBeenCalled();
  });

  it("normalizes input and creates an authenticated test order", async () => {
    const response = await POST(orderRequest());

    expect(response.status).toBe(201);
    expect(mocks.createOrder).toHaveBeenCalledWith(
      "user-id",
      expect.objectContaining({
        phone: "+79271234567",
        items: [{ productId: requestBody.items[0].productId, quantity: 2 }],
      }),
      { isTest: true },
    );
    expect(response.headers.get("cache-control")).toBe("no-store, private");
  });

  it("reports an idempotent retry without creating a second response resource", async () => {
    mocks.createOrder.mockResolvedValue({
      created: false,
      order: { id: "order-id", orderNo: "YR-ABC1234567", totalKopeks: 149_700 },
    });

    const response = await POST(orderRequest());

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(expect.objectContaining({ repeated: true }));
  });

  it("rejects cross-origin and client-supplied price fields", async () => {
    expect((await POST(orderRequest(requestBody, "https://attacker.example"))).status).toBe(403);
    expect((await POST(orderRequest({ ...requestBody, totalKopeks: 1 }))).status).toBe(400);
    expect(mocks.createOrder).not.toHaveBeenCalled();
  });
});
