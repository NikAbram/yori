import "server-only";

import { createHash, timingSafeEqual } from "node:crypto";

import type { Update } from "grammy/types";
import { z } from "zod";

import { prisma } from "@/lib/db/prisma";

const telegramUpdateSchema = z.object({
  update_id: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
}).passthrough();

function secretDigest(value: string) {
  return createHash("sha256").update(value).digest();
}

export function verifyTelegramWebhookSecret(
  receivedSecret: string | null,
  expectedSecret: string,
) {
  if (receivedSecret === null) return false;

  return timingSafeEqual(
    secretDigest(receivedSecret),
    secretDigest(expectedSecret),
  );
}

export function parseTelegramUpdate(input: unknown): Update {
  return telegramUpdateSchema.parse(input) as Update;
}

async function claimTelegramUpdate(updateId: number) {
  const result = await prisma.processedTelegramUpdate.createMany({
    data: { updateId: BigInt(updateId) },
    skipDuplicates: true,
  });
  return result.count === 1;
}

async function releaseTelegramUpdate(updateId: number) {
  await prisma.processedTelegramUpdate.deleteMany({
    where: { updateId: BigInt(updateId) },
  });
}

export async function processTelegramUpdate(
  update: Update,
  handleUpdate: (update: Update) => Promise<unknown>,
) {
  const claimed = await claimTelegramUpdate(update.update_id);
  if (!claimed) return { duplicate: true as const };

  try {
    await handleUpdate(update);
    return { duplicate: false as const };
  } catch (error) {
    await releaseTelegramUpdate(update.update_id);
    throw error;
  }
}
