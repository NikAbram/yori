export const PRODUCT_IMAGE_PATHS = [
  "/images/products/baked-roll.webp",
  "/images/products/berry-drink.webp",
  "/images/products/creamy-salmon-roll.webp",
  "/images/products/edamame.webp",
  "/images/products/lemonade.webp",
  "/images/products/miso-soup.webp",
  "/images/products/nigiri-assortment.webp",
  "/images/products/salmon-roll-dark.webp",
  "/images/products/sushi-set.webp",
  "/images/products/tempura-roll.webp",
  "/images/products/unagi-nigiri.webp",
] as const;

export const PRODUCT_IMAGE_OPTIONS = [
  { path: PRODUCT_IMAGE_PATHS[0], label: "Запечённые роллы" },
  { path: PRODUCT_IMAGE_PATHS[1], label: "Ягодный напиток" },
  { path: PRODUCT_IMAGE_PATHS[2], label: "Роллы со сливочной шапочкой" },
  { path: PRODUCT_IMAGE_PATHS[3], label: "Эдамаме" },
  { path: PRODUCT_IMAGE_PATHS[4], label: "Лимонад" },
  { path: PRODUCT_IMAGE_PATHS[5], label: "Мисо-суп" },
  { path: PRODUCT_IMAGE_PATHS[6], label: "Ассорти нигири" },
  { path: PRODUCT_IMAGE_PATHS[7], label: "Роллы с лососем" },
  { path: PRODUCT_IMAGE_PATHS[8], label: "Сет роллов" },
  { path: PRODUCT_IMAGE_PATHS[9], label: "Темпура" },
  { path: PRODUCT_IMAGE_PATHS[10], label: "Нигири с угрём" },
] as const;

export type ProductImagePath = (typeof PRODUCT_IMAGE_PATHS)[number];

export function isProductImagePath(value: string): value is ProductImagePath {
  return (PRODUCT_IMAGE_PATHS as readonly string[]).includes(value);
}
