import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ getSession: vi.fn(), getOrder: vi.fn() }));

vi.mock("server-only", () => ({}));
vi.mock("@/services/telegram-auth", () => ({ getCurrentTelegramSession: mocks.getSession }));
vi.mock("@/services/customer-orders", () => ({ getCustomerOrder: mocks.getOrder }));

import { GET } from "@/app/api/orders/[id]/route";

const ORDER_ID = "9ab96f80-58b8-4c49-8c93-1a6d282d3016";

function context(id: string) {
  return { params: Promise.resolve({ id }) };
}

describe("customer order detail route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getSession.mockResolvedValue({ userId: "owner-id" });
  });

  it("requires a verified Telegram session", async () => {
    mocks.getSession.mockResolvedValue(null);
    expect((await GET(new Request(`https://yori.test/api/orders/${ORDER_ID}`), context(ORDER_ID))).status).toBe(401);
    expect(mocks.getOrder).not.toHaveBeenCalled();
  });

  it("returns the same 404 for malformed, missing and foreign orders", async () => {
    expect((await GET(new Request("https://yori.test/api/orders/nope"), context("nope"))).status).toBe(404);
    mocks.getOrder.mockResolvedValue(null);
    const response = await GET(new Request(`https://yori.test/api/orders/${ORDER_ID}`), context(ORDER_ID));
    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({ error: "Заказ не найден." });
  });

  it("queries by the authenticated owner and returns a private response", async () => {
    mocks.getOrder.mockResolvedValue({ id: ORDER_ID, orderNo: "YR-123" });
    const response = await GET(new Request(`https://yori.test/api/orders/${ORDER_ID}`), context(ORDER_ID));
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store, private");
    expect(mocks.getOrder).toHaveBeenCalledWith("owner-id", ORDER_ID);
  });
});
