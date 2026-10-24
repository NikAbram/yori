import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireCurrentAdmin: vi.fn(),
  count: vi.fn(),
  aggregate: vi.fn(),
  findMany: vi.fn(),
  findUnique: vi.fn(),
  connection: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("next/server", () => ({ connection: mocks.connection }));
vi.mock("@/services/admin-auth", () => ({ requireCurrentAdmin: mocks.requireCurrentAdmin }));
vi.mock("@/lib/db/prisma", () => ({
  prisma: { order: { count: mocks.count, aggregate: mocks.aggregate, findMany: mocks.findMany, findUnique: mocks.findUnique } },
}));

import { getAdminDashboard, getAdminOrderDetail, listAdminOrders } from "@/services/admin-orders";

describe("administrative order reads", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireCurrentAdmin.mockResolvedValue({ id: "admin-id", role: "OWNER" });
  });

  it("authenticates before returning a real-data dashboard and excludes test revenue", async () => {
    mocks.count.mockResolvedValueOnce(8).mockResolvedValueOnce(2).mockResolvedValueOnce(3);
    mocks.aggregate.mockResolvedValue({ _sum: { totalKopeks: 245_000 } });
    mocks.findMany.mockResolvedValue([]);

    await expect(getAdminDashboard(7, new Date("2026-10-22T12:00:00Z"))).resolves.toMatchObject({
      orderCount: 8,
      newOrderCount: 2,
      testOrderCount: 3,
      deliveredRevenueKopeks: 245_000,
    });
    expect(mocks.requireCurrentAdmin).toHaveBeenCalledOnce();
    expect(mocks.aggregate).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ status: "DELIVERED", isTest: false }),
      _sum: { totalKopeks: true },
    }));
    expect(mocks.findMany).toHaveBeenCalledWith(expect.objectContaining({ take: 6 }));
  });

  it("uses one filtered count and one paginated select without loading full customers", async () => {
    mocks.count.mockResolvedValue(42);
    mocks.findMany.mockResolvedValue([]);

    const result = await listAdminOrders({
      q: "+7 999",
      status: "NEW",
      from: "2026-10-01",
      to: "2026-10-22",
      page: 2,
    });

    expect(result).toMatchObject({ totalCount: 42, page: 2, pageCount: 3 });
    expect(mocks.requireCurrentAdmin).toHaveBeenCalledOnce();
    expect(mocks.findMany).toHaveBeenCalledWith(expect.objectContaining({
      skip: 20,
      take: 20,
      where: expect.objectContaining({ status: "NEW", OR: expect.any(Array) }),
      select: expect.objectContaining({ recipientName: true, phone: true, items: expect.any(Object) }),
    }));
  });

  it("protects every administrative order read before Prisma", async () => {
    mocks.requireCurrentAdmin.mockRejectedValue(new Error("redirect"));

    await expect(getAdminDashboard(7, new Date("2026-10-22T12:00:00Z"))).rejects.toThrow("redirect");
    await expect(listAdminOrders({ q: "", page: 1 })).rejects.toThrow("redirect");
    await expect(getAdminOrderDetail("order-id")).rejects.toThrow("redirect");
    expect(mocks.requireCurrentAdmin).toHaveBeenCalledTimes(3);
    expect(mocks.connection).not.toHaveBeenCalled();
    expect(mocks.count).not.toHaveBeenCalled();
    expect(mocks.findMany).not.toHaveBeenCalled();
    expect(mocks.findUnique).not.toHaveBeenCalled();
  });

  it("authenticates detail reads and selects the operational relations explicitly", async () => {
    mocks.findUnique.mockResolvedValue(null);

    await expect(getAdminOrderDetail("order-id")).resolves.toBeNull();
    expect(mocks.requireCurrentAdmin).toHaveBeenCalledOnce();
    expect(mocks.findUnique).toHaveBeenCalledWith({
      where: { id: "order-id" },
      select: expect.objectContaining({
        items: expect.any(Object),
        statusHistory: expect.any(Object),
        internalNotes: expect.any(Object),
        notifications: expect.any(Object),
        adminAuditLogs: expect.any(Object),
      }),
    });
  });
});
