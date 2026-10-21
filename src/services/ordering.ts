import "server-only";

import { randomBytes } from "node:crypto";

import type { Prisma } from "@/generated/prisma/client";
import type { CreateOrderRequest } from "@/lib/checkout-schema";
import { prisma } from "@/lib/db/prisma";
import { CartPricingError, priceCartFromDatabase } from "@/services/cart-pricing";
import { consumeCheckoutRateLimit } from "@/services/checkout-rate-limit";

type OrderingErrorCode = "IDEMPOTENCY_KEY_CONFLICT" | "PAYMENT_METHOD_UNAVAILABLE";

export class OrderingError extends Error {
  constructor(public readonly code: OrderingErrorCode) {
    super(code);
    this.name = "OrderingError";
  }
}

const orderSelect = {
  id: true,
  orderNo: true,
  status: true,
  subtotalKopeks: true,
  deliveryKopeks: true,
  discountKopeks: true,
  totalKopeks: true,
  createdAt: true,
} satisfies Prisma.OrderSelect;

function generateOrderNumber() {
  return `YR-${randomBytes(5).toString("hex").toUpperCase()}`;
}

function isPrismaErrorWithCode(error: unknown, code: string) {
  return typeof error === "object" && error !== null && "code" in error && error.code === code;
}

async function findIdempotentOrder(userId: string, idempotencyKey: string) {
  const existing = await prisma.order.findUnique({
    where: { idempotencyKey },
    select: { userId: true, ...orderSelect },
  });
  if (!existing) return null;
  if (existing.userId !== userId) throw new OrderingError("IDEMPOTENCY_KEY_CONFLICT");

  const { userId: _userId, ...order } = existing;
  void _userId;
  return order;
}

export async function createOrder(
  userId: string,
  input: CreateOrderRequest,
  options: { isTest: boolean },
) {
  const existing = await findIdempotentOrder(userId, input.idempotencyKey);
  if (existing) return { created: false as const, order: existing };

  await consumeCheckoutRateLimit(userId);

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const order = await prisma.$transaction(async (transaction) => {
        const idempotentOrder = await transaction.order.findUnique({
          where: { idempotencyKey: input.idempotencyKey },
          select: { userId: true, ...orderSelect },
        });
        if (idempotentOrder) {
          if (idempotentOrder.userId !== userId) {
            throw new OrderingError("IDEMPOTENCY_KEY_CONFLICT");
          }
          const { userId: _userId, ...existingOrder } = idempotentOrder;
          void _userId;
          return { created: false as const, order: existingOrder };
        }

        const pricing = await priceCartFromDatabase(transaction, input.items);
        const paymentEnabled = input.paymentMethod === "CASH_ON_DELIVERY"
          ? pricing.cashOnDeliveryEnabled
          : pricing.cardOnDeliveryEnabled;
        if (!paymentEnabled) throw new OrderingError("PAYMENT_METHOD_UNAVAILABLE");

        const createdOrder = await transaction.order.create({
          data: {
            orderNo: generateOrderNumber(),
            userId,
            recipientName: input.recipientName,
            phone: input.phone,
            city: input.city,
            street: input.street,
            house: input.house,
            apartment: input.apartment || null,
            entrance: input.entrance || null,
            floor: input.floor || null,
            customerNote: input.comment || null,
            subtotalKopeks: pricing.subtotalKopeks,
            deliveryKopeks: pricing.deliveryKopeks,
            discountKopeks: pricing.discountKopeks,
            totalKopeks: pricing.totalKopeks,
            paymentMethod: input.paymentMethod,
            isTest: options.isTest,
            idempotencyKey: input.idempotencyKey,
            consentAcceptedAt: new Date(),
            items: {
              create: pricing.lines.map((line) => ({
                productId: line.productId,
                productNameSnapshot: line.productName,
                unitPriceKopeks: line.unitPriceKopeks,
                quantity: line.quantity,
                lineTotalKopeks: line.lineTotalKopeks,
              })),
            },
            statusHistory: {
              create: {
                toStatus: "NEW",
                actorType: "TELEGRAM_USER",
                telegramUserId: userId,
              },
            },
          },
          select: orderSelect,
        });

        return { created: true as const, order: createdOrder };
      }, { isolationLevel: "Serializable" });

      return order;
    } catch (error) {
      if (isPrismaErrorWithCode(error, "P2002")) {
        const idempotentOrder = await findIdempotentOrder(userId, input.idempotencyKey);
        if (idempotentOrder) return { created: false as const, order: idempotentOrder };
        if (attempt < 2) continue;
      }
      if (isPrismaErrorWithCode(error, "P2034") && attempt < 2) continue;
      if (error instanceof CartPricingError || error instanceof OrderingError) throw error;
      throw error;
    }
  }

  throw new Error("Order transaction retry limit exceeded.");
}
