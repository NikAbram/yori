export type CategorySlug =
  | "sets"
  | "classic"
  | "maki"
  | "baked"
  | "tempura"
  | "sushi"
  | "soups-snacks"
  | "drinks";

export type ProductBadge = "Хит" | "Новинка";

export type Product = {
  id: string;
  slug: string;
  category: CategorySlug;
  name: string;
  description: string;
  ingredients: string[];
  allergens: string[];
  image: string;
  imageAlt: string;
  priceKopeks: number;
  weightGrams?: number;
  volumeMl?: number;
  piecesCount?: number;
  badge?: ProductBadge;
  isAvailable: boolean;
  isFeatured: boolean;
  isRecommended: boolean;
  sortOrder: number;
};

export type Category = {
  slug: CategorySlug;
  name: string;
  shortName: string;
  eyebrow: string;
};

export type CartLine = {
  productId: string;
  quantity: number;
  priceKopeksSnapshot?: number;
};
