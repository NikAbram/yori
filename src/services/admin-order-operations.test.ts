import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireCurrentAdmin: vi.fn(),
  transaction: vi.fn(),
  orderFindUnique: vi.fn(),
  orderUpdateMany: vi.fn(),
  historyCreate: vi.fn(),
  noteCreate: vi.fn(),
  auditCreate: vi.fn(),
  notificationFindFirst: vi.fn(),
  enqueue: vi.fn(),
  retry: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("next/server", () => ({ connection: vi.fn() }));
vi.mock("@/services/admin-auth", () => ({ requireCurrentAdmin: mocks.requireCurrentAdmin }));
vi.mock("@/services/notifications", () => ({
  enqueueCustomerOrderNotification: mocks.enqueue,
  retryNotification: mocks.retry,
}));
vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    $transaction: mocks.transaction,
    notificationLog: { findFirst: mocks.notificationFindFirst },
    adminAuditLog: { create: mocks.auditCreate },
  },
}));

import {
  addAdminOrderNote,
  changeAdminOrderStatus,
  getAllowedAdminOrderStatuses,
  retryAdminOrderNotification,
} from "@/services/admin-orders";

const orderId = "7e27ec80-28ae-4d18-b1d6-15d452ecbaf4";
const notificationId = "d0353474-7d93-429d-a4ad-e2f112cb38b7";

describe("admin order operations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireCurrentAdmin.mockResolvedValue({ id: "admin-id", name: "Менеджер", role: "MANAGER" });
    const transaction = {
      order: { findUnique: mocks.orderFindUnique, updateMany: mocks.orderUpdateMany },
      orderStatusHistory: { create: mocks.historyCreate },
      orderInternalNote: { create: mocks.noteCreate },
      adminAuditLog: { create: mocks.auditCreate },
    };
    mocks.transaction.mockImplementation(async (callback: (client: typeof transaction) => unknown) => callback(transaction));
    mocks.orderUpdateMany.mockResolvedValue({ count: 1 });
    mocks.historyCreate.mockResolvedValue({ id: "history-id" });
    mocks.enqueue.mockResolvedValue({ id: notificationId });
    mocks.auditCreate.mockResolvedValue({ id: "audit-id" });
  });

  it("uses an explicit forward-only transition table", () => {
    expect(getAllowedAdminOrderStatuses("NEW")).toEqual(["CONFIRMED", "CANCELLED"]);
    expect(getAllowedAdminOrderStatuses("COURIER")).toEqual(["DELIVERED"]);
    expect(getAllowedAdminOrderStatuses("DELIVERED")).toEqual([]);
    expect(getAllowedAdminOrderStatuses("CANCELLED")).toEqual([]);
  });

  it("changes status, history, customer event and audit in one transaction", async () => {
    mocks.orderFindUnique.mockResolvedValue({ status: "NEW" });

    await expect(changeAdminOrderStatus(orderId, "CONFIRMED")).resolves.toEqual({
      notificationId,
      fromStatus: "NEW",
      toStatus: "CONFIRMED",
    });
    expect(mocks.orderUpdateMany).toHaveBeenCalledWith({
      where: { id: orderId, status: "NEW" },
      data: { status: "CONFIRMED" },
    });
    expect(mocks.historyCreate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ actorType: "ADMIN", adminUserId: "admin-id" }),
    }));
    expect(mocks.enqueue).toHaveBeenCalledWith(expect.any(Object), expect.objectContaining({
      eventType: "ORDER_CONFIRMED",
      deduplicationKey: "status-history:history-id",
    }));
    expect(mocks.auditCreate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ action: "ORDER_STATUS_CHANGED", adminUserId: "admin-id" }),
    }));
  });

  it("rejects an invalid or stale transition before writes", async () => {
    mocks.orderFindUnique.mockResolvedValue({ status: "DELIVERED" });

    await expect(changeAdminOrderStatus(orderId, "COOKING"))
      .rejects.toMatchObject({ code: "INVALID_STATUS_TRANSITION" });
    expect(mocks.orderUpdateMany).not.toHaveBeenCalled();
    expect(mocks.historyCreate).not.toHaveBeenCalled();
  });

  it("stores a plain internal note and a content-free audit entry", async () => {
    mocks.orderFindUnique.mockResolvedValue({ id: orderId });
    mocks.noteCreate.mockResolvedValue({ id: "note-id" });

    await expect(addAdminOrderNote(orderId, "Позвонить перед выездом")).resolves.toEqual({ id: "note-id" });
    expect(mocks.noteCreate).toHaveBeenCalledWith({
      data: { orderId, adminUserId: "admin-id", body: "Позвонить перед выездом" },
      select: { id: true },
    });
    expect(mocks.auditCreate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ summary: "Добавлена внутренняя заметка" }),
    }));
  });

  it("verifies notification ownership before a capped retry and audits the outcome", async () => {
    mocks.notificationFindFirst.mockResolvedValue({ id: notificationId });
    mocks.retry.mockResolvedValue({ outcome: "sent", attemptCount: 2 });

    await expect(retryAdminOrderNotification(orderId, notificationId))
      .resolves.toEqual({ outcome: "sent", attemptCount: 2 });
    expect(mocks.notificationFindFirst).toHaveBeenCalledWith({
      where: { id: notificationId, orderId },
      select: { id: true },
    });
    expect(mocks.auditCreate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ action: "NOTIFICATION_RETRY_REQUESTED" }),
    }));
  });

  it("authenticates before every mutation", async () => {
    mocks.requireCurrentAdmin.mockRejectedValue(new Error("redirect"));

    await expect(addAdminOrderNote(orderId, "Заметка")).rejects.toThrow("redirect");
    await expect(changeAdminOrderStatus(orderId, "CONFIRMED")).rejects.toThrow("redirect");
    await expect(retryAdminOrderNotification(orderId, notificationId)).rejects.toThrow("redirect");
    expect(mocks.transaction).not.toHaveBeenCalled();
    expect(mocks.notificationFindFirst).not.toHaveBeenCalled();
  });
});
