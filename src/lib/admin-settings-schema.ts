import { z } from "zod";

const TELEGRAM_CHAT_ID_PATTERN = /^-?[1-9]\d{0,19}$/;

function optionalText(maximum: number, message: string) {
  return z.string().trim().max(maximum, message).transform((value) => value || null);
}

export function settingsRublesToKopeks(value: string) {
  const [rubles, fractional = ""] = value.trim().replace(",", ".").split(".");
  return Number(rubles) * 100 + Number(fractional.padEnd(2, "0"));
}

function moneySchema(label: string, { optional = false }: { optional?: boolean } = {}) {
  return z.string()
    .trim()
    .refine(
      (value) => optional && value === "" || /^\d{1,7}(?:[.,]\d{1,2})?$/.test(value),
      `${label}: укажите сумму в рублях, не более двух знаков после запятой.`,
    )
    .transform((value) => value === "" ? null : settingsRublesToKopeks(value))
    .refine(
      (value) => value === null || Number.isSafeInteger(value) && value >= 0 && value <= 999_999_999,
      `${label}: сумма вне допустимого диапазона.`,
    );
}

export const adminSettingsInputSchema = z.object({
  brandName: z.string().trim().min(2, "Укажите название бренда.").max(80, "Название слишком длинное."),
  brandDescription: optionalText(500, "Описание бренда слишком длинное."),
  minimumOrderRubles: moneySchema("Минимальная сумма"),
  deliveryRubles: moneySchema("Стоимость доставки"),
  freeDeliveryFromRubles: moneySchema("Порог бесплатной доставки", { optional: true }),
  deliveryTerms: optionalText(4_000, "Условия доставки слишком длинные."),
  contactText: optionalText(2_000, "Контактные данные слишком длинные."),
  privacyText: optionalText(6_000, "Текст о данных слишком длинный."),
  operatorName: optionalText(160, "Название оператора слишком длинное."),
  managerTelegramChatId: z.string().trim().max(32, "Telegram chat ID слишком длинный.")
    .refine((value) => value === "" || TELEGRAM_CHAT_ID_PATTERN.test(value), "Проверьте Telegram chat ID.")
    .transform((value) => value || null),
  isOrderingEnabled: z.boolean(),
  cashOnDeliveryEnabled: z.boolean(),
  cardOnDeliveryEnabled: z.boolean(),
  commercialHostingConfirmed: z.boolean(),
  liveReadinessConfirmed: z.boolean(),
}).superRefine((value, context) => {
  if (value.isOrderingEnabled && !value.cashOnDeliveryEnabled && !value.cardOnDeliveryEnabled) {
    context.addIssue({
      code: "custom",
      path: ["cashOnDeliveryEnabled"],
      message: "Для приёма заказов включите хотя бы один способ оплаты.",
    });
  }
  if (
    value.freeDeliveryFromRubles !== null
    && value.minimumOrderRubles !== null
    && value.freeDeliveryFromRubles < value.minimumOrderRubles
  ) {
    context.addIssue({
      code: "custom",
      path: ["freeDeliveryFromRubles"],
      message: "Порог бесплатной доставки не может быть ниже минимальной суммы заказа.",
    });
  }
}).transform(({ minimumOrderRubles, deliveryRubles, freeDeliveryFromRubles, ...value }) => ({
  ...value,
  minimumOrderKopeks: minimumOrderRubles as number,
  deliveryKopeks: deliveryRubles as number,
  freeDeliveryFromKopeks: freeDeliveryFromRubles,
}));

export type AdminSettingsInput = z.input<typeof adminSettingsInputSchema>;
export type AdminSettingsData = z.output<typeof adminSettingsInputSchema>;
