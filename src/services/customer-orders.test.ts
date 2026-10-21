import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ findMany: vi.fn(), findFirst: vi.fn() }));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db/prisma", () => ({
  prisma: { order: { findMany: mocks.findMany, findFirst: mocks.findFirst } },
}));

import { getCustomerOrder, listCustomerOrders } from "@/services/customer-orders";

describe("customer order queries", () => {
  beforeEach(() => vi.clearAllMocks());

  it("scopes the list to its owner and exposes only a compact summary", async () => {
    mocks.findMany.mockResolvedValue([{
      id: "order-id",
      orderNo: "YR-123",
      status: "NEW",
      totalKopeks: 90_000,
      createdAt: new Date("2026-10-20T12:00:00Z"),
      items: [{ quantity: 2 }, { quantity: 1 }],
    }]);

    await expect(listCustomerOrders("owner-id")).resolves.toEqual([
      expect.objectContaining({ id: "order-id", itemCount: 3 }),
    ]);
    expect(mocks.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { userId: "owner-id" },
      take: 50,
    }));
  });

  it("uses owner and order IDs in the same database predicate", async () => {
    mocks.findFirst.mockResolvedValue(null);

    await expect(getCustomerOrder("owner-id", "order-id")).resolves.toBeNull();
    expect(mocks.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: "order-id", userId: "owner-id" },
    }));
  });
});
