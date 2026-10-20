import "server-only";

import { createHash } from "node:crypto";

import { prisma } from "@/lib/db/prisma";

const CHECKOUT_RATE_LIMIT = 5;
const CHECKOUT_RATE_WINDOW_MS = 10 * 60 * 1_000;

export class CheckoutRateLimitError extends Error {
  constructor(public readonly retryAfterSeconds: number) {
    super("CHECKOUT_RATE_LIMITED");
    this.name = "CheckoutRateLimitError";
  }
}

export async function consumeCheckoutRateLimit(userId: string, now = new Date()) {
  const windowStartMs = Math.floor(now.getTime() / CHECKOUT_RATE_WINDOW_MS) * CHECKOUT_RATE_WINDOW_MS;
  const windowStart = new Date(windowStartMs);
  const expiresAt = new Date(windowStartMs + CHECKOUT_RATE_WINDOW_MS * 2);
  const subjectHash = createHash("sha256").update(userId).digest("hex");

  const bucket = await prisma.rateLimitBucket.upsert({
    where: {
      action_subjectHash_windowStart: {
        action: "checkout",
        subjectHash,
        windowStart,
      },
    },
    create: {
      action: "checkout",
      subjectHash,
      windowStart,
      expiresAt,
      count: 1,
    },
    update: { count: { increment: 1 }, expiresAt },
    select: { count: true },
  });

  if (bucket.count > CHECKOUT_RATE_LIMIT) {
    const retryAfterSeconds = Math.max(
      1,
      Math.ceil((windowStartMs + CHECKOUT_RATE_WINDOW_MS - now.getTime()) / 1_000),
    );
    throw new CheckoutRateLimitError(retryAfterSeconds);
  }
}
