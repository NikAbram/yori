import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ settingsFindUnique: vi.fn() }));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db/prisma", () => ({
  prisma: { siteSettings: { findUnique: mocks.settingsFindUnique } },
}));

import {
  getOrderAccess,
  isPrivateTestAllowlisted,
  parsePrivateTestAllowlist,
} from "@/services/order-access";

const readySettings = {
  isOrderingEnabled: true,
  cashOnDeliveryEnabled: true,
  cardOnDeliveryEnabled: false,
  contactText: "Контакты оператора",
  deliveryTerms: "Зона и условия доставки",
  privacyText: "Политика обработки данных",
  operatorName: "Оператор YŌRI",
  commercialHostingConfirmed: true,
  liveReadyAt: new Date("2026-10-20T12:00:00Z"),
};

describe("order access policy", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
    mocks.settingsFindUnique.mockResolvedValue(readySettings);
  });

  it("parses a lossless server allowlist and fails closed on invalid values", () => {
    expect([...parsePrivateTestAllowlist("42, 9007199254740991,42")]).toEqual([
      "42",
      "9007199254740991",
    ]);
    vi.stubEnv("ALLOWED_TELEGRAM_USER_IDS", "42,not-an-id");
    expect(isPrivateTestAllowlisted("42")).toBe(false);
  });

  it("allows only an env-allowlisted and database-enabled private tester", async () => {
    vi.stubEnv("ORDER_MODE", "private_test");
    vi.stubEnv("ALLOWED_TELEGRAM_USER_IDS", "42");

    await expect(getOrderAccess({ telegramId: "42", allowPrivateTest: true })).resolves.toEqual({
      allowed: true,
      isTest: true,
      cashOnDeliveryEnabled: true,
      cardOnDeliveryEnabled: false,
    });
    await expect(getOrderAccess({ telegramId: "43", allowPrivateTest: true })).resolves.toEqual(
      expect.objectContaining({ allowed: false }),
    );
    await expect(getOrderAccess({ telegramId: "42", allowPrivateTest: false })).resolves.toEqual(
      expect.objectContaining({ allowed: false }),
    );
  });

  it("fails closed for missing or unknown modes without reading settings", async () => {
    vi.stubEnv("ALLOWED_TELEGRAM_USER_IDS", "42");

    await expect(getOrderAccess({ telegramId: "42", allowPrivateTest: true })).resolves.toEqual(
      expect.objectContaining({ allowed: false }),
    );
    vi.stubEnv("ORDER_MODE", "unexpected");
    await expect(getOrderAccess({ telegramId: "42", allowPrivateTest: true })).resolves.toEqual(
      expect.objectContaining({ allowed: false }),
    );
    expect(mocks.settingsFindUnique).not.toHaveBeenCalled();
  });

  it("keeps live mode closed until every server readiness condition is present", async () => {
    vi.stubEnv("ORDER_MODE", "live");
    await expect(getOrderAccess(null)).resolves.toEqual(expect.objectContaining({ allowed: false }));
    expect(mocks.settingsFindUnique).not.toHaveBeenCalled();

    mocks.settingsFindUnique.mockResolvedValue({ ...readySettings, commercialHostingConfirmed: false });

    await expect(getOrderAccess({ telegramId: "42", allowPrivateTest: false })).resolves.toEqual(
      expect.objectContaining({ allowed: false }),
    );

    mocks.settingsFindUnique.mockResolvedValue(readySettings);
    await expect(getOrderAccess({ telegramId: "42", allowPrivateTest: false })).resolves.toEqual(
      expect.objectContaining({ allowed: true, isTest: false }),
    );
  });

  it("requires ordering, a payment method and complete live readiness data", async () => {
    vi.stubEnv("ORDER_MODE", "live");
    const session = { telegramId: "42", allowPrivateTest: false };

    for (const settings of [
      { ...readySettings, isOrderingEnabled: false },
      { ...readySettings, cashOnDeliveryEnabled: false, cardOnDeliveryEnabled: false },
      { ...readySettings, operatorName: " " },
      { ...readySettings, deliveryTerms: null },
      { ...readySettings, contactText: null },
      { ...readySettings, privacyText: null },
      { ...readySettings, liveReadyAt: null },
    ]) {
      mocks.settingsFindUnique.mockResolvedValueOnce(settings);
      await expect(getOrderAccess(session)).resolves.toEqual(expect.objectContaining({ allowed: false }));
    }
  });

  it("does not query settings for a denied private user", async () => {
    vi.stubEnv("ORDER_MODE", "private_test");
    vi.stubEnv("ALLOWED_TELEGRAM_USER_IDS", "42");

    await getOrderAccess({ telegramId: "43", allowPrivateTest: true });
    expect(mocks.settingsFindUnique).not.toHaveBeenCalled();
  });
});
