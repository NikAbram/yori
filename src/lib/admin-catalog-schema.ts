import { z } from "zod";

import { PRODUCT_IMAGE_PATHS } from "@/data/product-images";

const slugSchema = z.string()
  .trim()
  .min(2, "Укажите slug.")
  .max(128, "Slug слишком длинный.")
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Используйте строчные латинские буквы, цифры и дефисы.");

const optionalIntegerSchema = (label: string, maximum: number) => z.string()
  .trim()
  .refine((value) => value === "" || /^\d+$/.test(value), `${label}: укажите целое число.`)
  .transform((value) => value === "" ? null : Number(value))
  .refine((value) => value === null || (value > 0 && value <= maximum), `${label}: значение вне допустимого диапазона.`);

const listSchema = (label: string, required: boolean) => z.string()
  .trim()
  .max(2_000, `${label}: список слишком длинный.`)
  .transform((value) => value
    .split(/[,\n]/)
    .map((item) => item.trim())
    .filter(Boolean))
  .refine((items) => !required || items.length > 0, `${label}: добавьте хотя бы один пункт.`)
  .refine((items) => items.length <= 32, `${label}: допускается не более 32 пунктов.`)
  .refine((items) => items.every((item) => item.length <= 160), `${label}: один из пунктов слишком длинный.`);

export function rublesToKopeks(value: string) {
  const [rubles, fractional = ""] = value.trim().replace(",", ".").split(".");
  return Number(rubles) * 100 + Number(fractional.padEnd(2, "0"));
}

const priceRublesSchema = z.string()
  .trim()
  .regex(/^\d{1,6}(?:[.,]\d{1,2})?$/, "Укажите цену в рублях, не более двух знаков после запятой.")
  .transform(rublesToKopeks)
  .refine((value) => value > 0 && value <= 99_999_999, "Цена вне допустимого диапазона.");

export const adminCategoryInputSchema = z.object({
  name: z.string().trim().min(2, "Укажите название.").max(128, "Название слишком длинное."),
  shortName: z.string().trim().min(2, "Укажите короткое название.").max(64, "Короткое название слишком длинное."),
  eyebrow: z.string().trim().max(128, "Подпись слишком длинная.").transform((value) => value || null),
  slug: slugSchema.max(96, "Slug категории слишком длинный."),
  sortOrder: z.string().trim().regex(/^\d+$/, "Укажите целый порядок.").transform(Number).pipe(z.number().int().min(0).max(100_000)),
  isPublished: z.boolean(),
});

export const adminProductInputSchema = z.object({
  categoryId: z.uuid("Выберите категорию."),
  name: z.string().trim().min(2, "Укажите название.").max(160, "Название слишком длинное."),
  slug: slugSchema,
  description: z.string().trim().min(10, "Добавьте описание от 10 символов.").max(2_000, "Описание слишком длинное."),
  ingredientsText: listSchema("Состав", true),
  allergensText: listSchema("Аллергены", false),
  imagePath: z.enum(PRODUCT_IMAGE_PATHS, "Выберите подготовленное изображение."),
  imageAlt: z.string().trim().min(5, "Опишите изображение.").max(255, "Alt-текст слишком длинный."),
  weightGrams: optionalIntegerSchema("Вес", 100_000),
  volumeMl: optionalIntegerSchema("Объём", 100_000),
  piecesCount: optionalIntegerSchema("Количество штук", 1_000),
  priceRubles: priceRublesSchema,
  badge: z.string().trim().max(64, "Бейдж слишком длинный.").transform((value) => value || null),
  isAvailable: z.boolean(),
  isPublished: z.boolean(),
  isFeatured: z.boolean(),
  isRecommended: z.boolean(),
  sortOrder: z.string().trim().regex(/^\d+$/, "Укажите целый порядок.").transform(Number).pipe(z.number().int().min(0).max(100_000)),
}).superRefine((value, context) => {
  if (value.weightGrams === null && value.volumeMl === null && value.piecesCount === null) {
    context.addIssue({
      code: "custom",
      path: ["weightGrams"],
      message: "Укажите вес, объём или количество штук.",
    });
  }
}).transform(({ ingredientsText, allergensText, priceRubles, ...value }) => ({
  ...value,
  ingredients: ingredientsText,
  allergens: allergensText,
  priceKopeks: priceRubles,
}));

export const adminCatalogIdSchema = z.uuid();

export type AdminCategoryInput = z.input<typeof adminCategoryInputSchema>;
export type AdminCategoryData = z.output<typeof adminCategoryInputSchema>;
export type AdminProductInput = z.input<typeof adminProductInputSchema>;
export type AdminProductData = z.output<typeof adminProductInputSchema>;
