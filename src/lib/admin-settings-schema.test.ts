import { describe, expect, it } from "vitest";

import { adminSettingsInputSchema, settingsRublesToKopeks } from "@/lib/admin-settings-schema";

const validInput = {
  brandName: "YŌRI",
  brandDescription: "Современная доставка роллов",
  minimumOrderRubles: "700",
  deliveryRubles: "199,50",
  freeDeliveryFromRubles: "1800",
  deliveryTerms: "Доставка в подтверждённой зоне",
  contactText: "Связь через Telegram",
  privacyText: "Условия обработки данных",
  operatorName: "Оператор YŌRI",
  managerTelegramChatId: "-1001234567890",
  isOrderingEnabled: true,
  cashOnDeliveryEnabled: true,
  cardOnDeliveryEnabled: false,
  commercialHostingConfirmed: false,
  liveReadinessConfirmed: false,
};

describe("admin settings schema", () => {
  it("converts rubles to integer kopeks without float arithmetic", () => {
    expect(settingsRublesToKopeks("199,50")).toBe(19_950);
    expect(adminSettingsInputSchema.parse(validInput)).toEqual(expect.objectContaining({
      minimumOrderKopeks: 70_000,
      deliveryKopeks: 19_950,
      freeDeliveryFromKopeks: 180_000,
    }));
  });

  it("supports disabling the free-delivery threshold", () => {
    expect(adminSettingsInputSchema.parse({ ...validInput, freeDeliveryFromRubles: "" }).freeDeliveryFromKopeks).toBeNull();
  });

  it("rejects inconsistent payment, threshold and Telegram settings", () => {
    const result = adminSettingsInputSchema.safeParse({
      ...validInput,
      cashOnDeliveryEnabled: false,
      freeDeliveryFromRubles: "600",
      managerTelegramChatId: "telegram-user",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      const fields = result.error.flatten().fieldErrors as Record<string, string[] | undefined>;
      expect(fields.cashOnDeliveryEnabled).toBeDefined();
      expect(fields.freeDeliveryFromRubles).toBeDefined();
      expect(fields.managerTelegramChatId).toBeDefined();
    }
  });
});
