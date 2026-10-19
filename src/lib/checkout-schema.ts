import { z } from "zod";

export function normalizeRussianPhone(value: string) {
  const digits = value.replace(/\D/g, "");
  if (digits.length === 10) return `+7${digits}`;
  if (digits.length === 11 && digits.startsWith("8")) return `+7${digits.slice(1)}`;
  if (digits.length === 11 && digits.startsWith("7")) return `+${digits}`;
  return value.trim();
}

const requiredText = (message: string, max: number) => z.string().trim().min(2, message).max(max, `Не более ${max} символов`);
const optionalText = (max: number) => z.string().trim().max(max, `Не более ${max} символов`);

export const checkoutSchema = z.object({
  recipientName: requiredText("Укажите имя получателя", 80),
  phone: z.string().trim().transform(normalizeRussianPhone).refine((value) => /^\+7\d{10}$/.test(value), "Введите российский номер из 10 цифр"),
  city: requiredText("Укажите город", 80),
  street: requiredText("Укажите улицу", 120),
  house: z.string().trim().min(1, "Укажите дом").max(20, "Не более 20 символов"),
  apartment: optionalText(20),
  entrance: optionalText(20),
  floor: optionalText(20),
  comment: optionalText(500),
  consent: z.boolean().refine(Boolean, "Подтвердите согласие на обработку данных"),
});

export type CheckoutFormInput = z.input<typeof checkoutSchema>;
export type CheckoutFormValues = z.output<typeof checkoutSchema>;
