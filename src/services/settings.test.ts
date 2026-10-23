import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireCurrentAdmin: vi.fn(),
  settingsFindUnique: vi.fn(),
  transaction: vi.fn(),
  txSettingsFindUnique: vi.fn(),
  txSettingsUpsert: vi.fn(),
  txAuditCreate: vi.fn(),
  cacheLife: vi.fn(),
  cacheTag: vi.fn(),
  updateTag: vi.fn(),
  managerChatId: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({
  cacheLife: mocks.cacheLife,
  cacheTag: mocks.cacheTag,
  updateTag: mocks.updateTag,
}));
vi.mock("@/services/admin-auth", () => ({ requireCurrentAdmin: mocks.requireCurrentAdmin }));
vi.mock("@/lib/telegram/bot-config", () => ({ getOptionalTelegramManagerChatId: mocks.managerChatId }));
vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    siteSettings: { findUnique: mocks.settingsFindUnique },
    $transaction: mocks.transaction,
  },
}));

import {
  SETTINGS_CACHE_TAG,
  expirePublicSettingsCache,
  getAdminSettingsEditor,
  getPublicSiteSettings,
  updateAdminSettings,
} from "@/services/settings";

const updatedAt = new Date("2026-10-23T08:00:00.000Z");
const readyRow = {
  id: "default",
  brandName: "YŌRI",
  brandDescription: "Описание",
  isOrderingEnabled: true,
  deliveryKopeks: 19_900,
  freeDeliveryFromKopeks: 180_000,
  minimumOrderKopeks: 70_000,
  cashOnDeliveryEnabled: true,
  cardOnDeliveryEnabled: false,
  contactText: "Контакты",
  deliveryTerms: "Зона доставки",
  privacyText: "Правовые сведения",
  operatorName: "Оператор",
  managerTelegramChatId: "-1001234567890",
  commercialHostingConfirmed: true,
  liveReadyAt: updatedAt,
  updatedAt,
  updatedByAdmin: { name: "Владелец" },
};

const readyInput = {
  brandName: readyRow.brandName,
  brandDescription: readyRow.brandDescription,
  isOrderingEnabled: readyRow.isOrderingEnabled,
  deliveryKopeks: readyRow.deliveryKopeks,
  freeDeliveryFromKopeks: readyRow.freeDeliveryFromKopeks,
  minimumOrderKopeks: readyRow.minimumOrderKopeks,
  cashOnDeliveryEnabled: readyRow.cashOnDeliveryEnabled,
  cardOnDeliveryEnabled: readyRow.cardOnDeliveryEnabled,
  contactText: readyRow.contactText,
  deliveryTerms: readyRow.deliveryTerms,
  privacyText: readyRow.privacyText,
  operatorName: readyRow.operatorName,
  managerTelegramChatId: readyRow.managerTelegramChatId,
  commercialHostingConfirmed: readyRow.commercialHostingConfirmed,
  liveReadinessConfirmed: true,
};

describe("restaurant settings service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
    mocks.requireCurrentAdmin.mockResolvedValue({ id: "admin-id", role: "OWNER" });
    mocks.managerChatId.mockReturnValue(null);
    mocks.settingsFindUnique.mockResolvedValue(readyRow);
    mocks.txSettingsFindUnique.mockResolvedValue(readyRow);
    mocks.txSettingsUpsert.mockResolvedValue({ updatedAt: new Date("2026-10-23T09:00:00.000Z") });
    mocks.txAuditCreate.mockResolvedValue({ id: "audit-id" });
    mocks.transaction.mockImplementation((callback) => callback({
      siteSettings: {
        findUnique: mocks.txSettingsFindUnique,
        upsert: mocks.txSettingsUpsert,
      },
      adminAuditLog: { create: mocks.txAuditCreate },
    }));
  });

  it("returns a minimal public DTO and derives public opening from the server mode", async () => {
    vi.stubEnv("ORDER_MODE", "live");
    const settings = await getPublicSiteSettings();

    expect(settings).toEqual(expect.objectContaining({
      brandName: "YŌRI",
      minimumOrderKopeks: 70_000,
      isPublicOrderingOpen: true,
    }));
    expect(settings).not.toHaveProperty("managerTelegramChatId");
    expect(settings).not.toHaveProperty("updatedByAdmin");
    expect(mocks.cacheTag).toHaveBeenCalledWith(SETTINGS_CACHE_TAG);
  });

  it("authenticates before reading or writing administrative settings", async () => {
    mocks.requireCurrentAdmin.mockRejectedValue(new Error("redirect"));

    await expect(getAdminSettingsEditor()).rejects.toThrow("redirect");
    await expect(updateAdminSettings(readyInput, updatedAt.toISOString())).rejects.toThrow("redirect");
    expect(mocks.settingsFindUnique).not.toHaveBeenCalled();
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("updates settings and writes a value-free audit record in one transaction", async () => {
    await updateAdminSettings({ ...readyInput, deliveryKopeks: 25_000 }, updatedAt.toISOString());

    expect(mocks.txSettingsUpsert).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: "default" },
      update: expect.objectContaining({ deliveryKopeks: 25_000, updatedByAdminId: "admin-id" }),
    }));
    expect(mocks.txAuditCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: "SETTINGS_UPDATED",
        summary: expect.stringContaining("стоимость доставки"),
      }),
    });
    expect(mocks.txAuditCreate.mock.calls[0][0].data.summary).not.toContain("25000");
    expect(mocks.transaction).toHaveBeenCalledWith(expect.any(Function), { isolationLevel: "Serializable" });
  });

  it("rejects stale editors and incomplete live confirmation before any write", async () => {
    await expect(updateAdminSettings(readyInput, "2026-10-22T00:00:00.000Z")).rejects.toMatchObject({ code: "SETTINGS_CHANGED" });
    expect(mocks.txSettingsUpsert).not.toHaveBeenCalled();

    await expect(updateAdminSettings({ ...readyInput, contactText: null }, updatedAt.toISOString())).rejects.toMatchObject({
      code: "LIVE_READINESS_INCOMPLETE",
      missing: expect.arrayContaining(["Достоверные контакты"]),
    });
    expect(mocks.txSettingsUpsert).not.toHaveBeenCalled();
    expect(mocks.txAuditCreate).not.toHaveBeenCalled();
  });

  it("does not let a manager confirm commercial hosting or live readiness", async () => {
    mocks.requireCurrentAdmin.mockResolvedValue({ id: "manager-id", role: "MANAGER" });
    mocks.txSettingsFindUnique.mockResolvedValue({
      ...readyRow,
      commercialHostingConfirmed: false,
      liveReadyAt: null,
    });

    await updateAdminSettings(readyInput, updatedAt.toISOString());
    expect(mocks.txSettingsUpsert).toHaveBeenCalledWith(expect.objectContaining({
      update: expect.objectContaining({ commercialHostingConfirmed: false, liveReadyAt: null }),
    }));
  });

  it("clears a previous live confirmation after an operational manager edit", async () => {
    mocks.requireCurrentAdmin.mockResolvedValue({ id: "manager-id", role: "MANAGER" });

    await updateAdminSettings({ ...readyInput, deliveryKopeks: 25_000 }, updatedAt.toISOString());

    expect(mocks.txSettingsUpsert).toHaveBeenCalledWith(expect.objectContaining({
      update: expect.objectContaining({ deliveryKopeks: 25_000, liveReadyAt: null }),
    }));
  });

  it("lets the owner explicitly revoke a previous live confirmation", async () => {
    await updateAdminSettings({ ...readyInput, liveReadinessConfirmed: false }, updatedAt.toISOString());

    expect(mocks.txSettingsUpsert).toHaveBeenCalledWith(expect.objectContaining({
      update: expect.objectContaining({ liveReadyAt: null }),
    }));
    expect(mocks.txAuditCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({ summary: expect.stringContaining("подтверждение готовности live") }),
    });
  });

  it("expires the public settings cache explicitly", () => {
    expirePublicSettingsCache();
    expect(mocks.updateTag).toHaveBeenCalledWith(SETTINGS_CACHE_TAG);
  });
});
