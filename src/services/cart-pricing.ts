import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import type { CreateOrderRequest } from "@/lib/checkout-schema";

export type CartItemInput = CreateOrderRequest["items"][number];

export type PricedCartLine = {
  productId: string;
  productName: string;
  unitPriceKopeks: number;
  quantity: number;
  lineTotalKopeks: number;
};

export type CartPricing = {
  lines: PricedCartLine[];
  subtotalKopeks: number;
  deliveryKopeks: number;
  discountKopeks: number;
  totalKopeks: number;
  cashOnDeliveryEnabled: boolean;
  cardOnDeliveryEnabled: boolean;
  managerTelegramChatId: string | null;
};

type CartPricingErrorCode =
  | "ORDERING_UNAVAILABLE"
  | "ITEM_UNAVAILABLE"
  | "MINIMUM_ORDER_NOT_MET"
  | "INVALID_PRICING_CONFIGURATION";

export class CartPricingError extends Error {
  constructor(
    public readonly code: CartPricingErrorCode,
    public readonly details?: { minimumOrderKopeks?: number },
  ) {
    super(code);
    this.name = "CartPricingError";
  }
}

type ProductPricingRow = {
  id: string;
  name: string;
  priceKopeks: number;
  isAvailable: boolean;
};

type PricingSettings = {
  isOrderingEnabled: boolean;
  deliveryKopeks: number;
  freeDeliveryFromKopeks: number | null;
  minimumOrderKopeks: number;
  cashOnDeliveryEnabled: boolean;
  cardOnDeliveryEnabled: boolean;
  managerTelegramChatId: string | null;
};

function isSafeKopekAmount(value: number) {
  return Number.isSafeInteger(value) && value >= 0;
}

export function calculateCartPricing(
  items: CartItemInput[],
  products: ProductPricingRow[],
  settings: PricingSettings,
): CartPricing {
  if (!settings.isOrderingEnabled) throw new CartPricingError("ORDERING_UNAVAILABLE");
  if (
    !isSafeKopekAmount(settings.deliveryKopeks) ||
    !isSafeKopekAmount(settings.minimumOrderKopeks) ||
    (settings.freeDeliveryFromKopeks !== null && !isSafeKopekAmount(settings.freeDeliveryFromKopeks))
  ) {
    throw new CartPricingError("INVALID_PRICING_CONFIGURATION");
  }

  const productsById = new Map(products.map((product) => [product.id, product]));
  const lines = items.map((item) => {
    const product = productsById.get(item.productId);
    if (!product?.isAvailable || !isSafeKopekAmount(product.priceKopeks)) {
      throw new CartPricingError("ITEM_UNAVAILABLE");
    }

    const lineTotalKopeks = product.priceKopeks * item.quantity;
    if (!Number.isSafeInteger(lineTotalKopeks)) {
      throw new CartPricingError("INVALID_PRICING_CONFIGURATION");
    }

    return {
      productId: product.id,
      productName: product.name,
      unitPriceKopeks: product.priceKopeks,
      quantity: item.quantity,
      lineTotalKopeks,
    };
  });

  const subtotalKopeks = lines.reduce((sum, line) => sum + line.lineTotalKopeks, 0);
  if (!Number.isSafeInteger(subtotalKopeks)) {
    throw new CartPricingError("INVALID_PRICING_CONFIGURATION");
  }
  if (subtotalKopeks < settings.minimumOrderKopeks) {
    throw new CartPricingError("MINIMUM_ORDER_NOT_MET", {
      minimumOrderKopeks: settings.minimumOrderKopeks,
    });
  }

  const deliveryKopeks = settings.freeDeliveryFromKopeks !== null &&
    subtotalKopeks >= settings.freeDeliveryFromKopeks
    ? 0
    : settings.deliveryKopeks;
  const discountKopeks = 0;
  const totalKopeks = subtotalKopeks + deliveryKopeks - discountKopeks;
  if (!Number.isSafeInteger(totalKopeks)) {
    throw new CartPricingError("INVALID_PRICING_CONFIGURATION");
  }

  return {
    lines,
    subtotalKopeks,
    deliveryKopeks,
    discountKopeks,
    totalKopeks,
    cashOnDeliveryEnabled: settings.cashOnDeliveryEnabled,
    cardOnDeliveryEnabled: settings.cardOnDeliveryEnabled,
    managerTelegramChatId: settings.managerTelegramChatId,
  };
}

export async function priceCartFromDatabase(
  transaction: Prisma.TransactionClient,
  items: CartItemInput[],
) {
  const productIds = items.map((item) => item.productId);
  const [products, settings] = await Promise.all([
    transaction.product.findMany({
      where: {
        id: { in: productIds },
        isPublished: true,
        category: { isPublished: true },
      },
      select: { id: true, name: true, priceKopeks: true, isAvailable: true },
    }),
    transaction.siteSettings.findUnique({
      where: { id: "default" },
      select: {
        isOrderingEnabled: true,
        deliveryKopeks: true,
        freeDeliveryFromKopeks: true,
        minimumOrderKopeks: true,
        cashOnDeliveryEnabled: true,
        cardOnDeliveryEnabled: true,
        managerTelegramChatId: true,
      },
    }),
  ]);

  if (!settings) throw new CartPricingError("ORDERING_UNAVAILABLE");
  if (products.length !== productIds.length) throw new CartPricingError("ITEM_UNAVAILABLE");

  return calculateCartPricing(items, products, settings);
}
