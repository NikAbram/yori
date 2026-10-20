import "server-only";

import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { z } from "zod";

import { prisma } from "@/lib/db/prisma";

export const TELEGRAM_INIT_DATA_MAX_LENGTH = 8_192;
export const TELEGRAM_INIT_DATA_DEFAULT_MAX_AGE_SECONDS = 3_600;
export const TELEGRAM_SESSION_DEFAULT_TTL_SECONDS = 86_400;
const TELEGRAM_INIT_DATA_MAX_AGE_LIMIT_SECONDS = 86_400;
const TELEGRAM_SESSION_TTL_LIMIT_SECONDS = 2_592_000;

const TELEGRAM_ID_PATTERN = /^[1-9]\d{0,31}$/;
const TELEGRAM_HASH_PATTERN = /^[a-f\d]{64}$/i;
const TELEGRAM_USER_ID_PATTERN = /(?:^|[,{])\s*"id"\s*:\s*(\d{1,32})(?=\s*[,}])/;

const telegramUserSchema = z
  .object({
    id: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
    first_name: z.string().trim().min(1).max(128),
    last_name: z.string().trim().min(1).max(128).optional(),
    username: z.string().trim().min(1).max(64).optional(),
    language_code: z.string().trim().min(1).max(16).optional(),
  })
  .passthrough();

export type VerifiedTelegramIdentity = {
  telegramId: string;
  firstName: string;
  lastName: string | null;
  username: string | null;
  languageCode: string | null;
};

export type TelegramSessionOwner = VerifiedTelegramIdentity & {
  userId: string;
  allowPrivateTest: boolean;
};

type TelegramAuthErrorCode =
  | "INVALID_INIT_DATA"
  | "EXPIRED_INIT_DATA"
  | "FUTURE_INIT_DATA"
  | "BLOCKED_USER";

export class TelegramAuthError extends Error {
  constructor(public readonly code: TelegramAuthErrorCode) {
    super(code);
    this.name = "TelegramAuthError";
  }
}

function boundedPositiveIntegerFromEnv(value: string | undefined, fallback: number, maximum: number) {
  if (!value) return fallback;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 && parsed <= maximum ? parsed : fallback;
}

export function getTelegramInitDataMaxAgeSeconds() {
  return boundedPositiveIntegerFromEnv(
    process.env.TELEGRAM_INIT_DATA_MAX_AGE_SECONDS,
    TELEGRAM_INIT_DATA_DEFAULT_MAX_AGE_SECONDS,
    TELEGRAM_INIT_DATA_MAX_AGE_LIMIT_SECONDS,
  );
}

export function getTelegramSessionTtlSeconds() {
  return boundedPositiveIntegerFromEnv(
    process.env.TELEGRAM_SESSION_TTL_SECONDS,
    TELEGRAM_SESSION_DEFAULT_TTL_SECONDS,
    TELEGRAM_SESSION_TTL_LIMIT_SECONDS,
  );
}

export function buildTelegramDataCheckString(params: URLSearchParams) {
  const pairs: string[] = [];
  const seen = new Set<string>();

  for (const [key, value] of params) {
    if (seen.has(key)) throw new TelegramAuthError("INVALID_INIT_DATA");
    seen.add(key);
    if (key !== "hash") pairs.push(`${key}=${value}`);
  }

  return pairs.sort().join("\n");
}

export function calculateTelegramInitDataHash(dataCheckString: string, botToken: string) {
  const secretKey = createHmac("sha256", "WebAppData").update(botToken).digest();
  return createHmac("sha256", secretKey).update(dataCheckString).digest("hex");
}

function hashesMatch(receivedHash: string, expectedHash: string) {
  if (!TELEGRAM_HASH_PATTERN.test(receivedHash)) return false;
  const received = Buffer.from(receivedHash, "hex");
  const expected = Buffer.from(expectedHash, "hex");
  return received.length === expected.length && timingSafeEqual(received, expected);
}

function parseTelegramUser(rawUser: string): VerifiedTelegramIdentity {
  const idMatch = TELEGRAM_USER_ID_PATTERN.exec(rawUser);
  if (!idMatch || !TELEGRAM_ID_PATTERN.test(idMatch[1])) {
    throw new TelegramAuthError("INVALID_INIT_DATA");
  }

  let parsedUser: unknown;
  try {
    parsedUser = JSON.parse(rawUser);
  } catch {
    throw new TelegramAuthError("INVALID_INIT_DATA");
  }

  const parsed = telegramUserSchema.safeParse(parsedUser);
  if (!parsed.success || String(parsed.data.id) !== idMatch[1]) {
    throw new TelegramAuthError("INVALID_INIT_DATA");
  }

  return {
    telegramId: idMatch[1],
    firstName: parsed.data.first_name,
    lastName: parsed.data.last_name ?? null,
    username: parsed.data.username ?? null,
    languageCode: parsed.data.language_code ?? null,
  };
}

export function verifyTelegramInitData(
  rawInitData: string,
  botToken: string,
  options: { now?: Date; maxAgeSeconds?: number; futureToleranceSeconds?: number } = {},
) {
  if (!rawInitData || rawInitData.length > TELEGRAM_INIT_DATA_MAX_LENGTH || !botToken) {
    throw new TelegramAuthError("INVALID_INIT_DATA");
  }

  const params = new URLSearchParams(rawInitData);
  const receivedHash = params.get("hash") ?? "";
  const dataCheckString = buildTelegramDataCheckString(params);
  const expectedHash = calculateTelegramInitDataHash(dataCheckString, botToken);

  if (!hashesMatch(receivedHash, expectedHash)) {
    throw new TelegramAuthError("INVALID_INIT_DATA");
  }

  const authDateRaw = params.get("auth_date");
  if (!authDateRaw || !/^\d{1,12}$/.test(authDateRaw)) {
    throw new TelegramAuthError("INVALID_INIT_DATA");
  }

  const authDateSeconds = Number(authDateRaw);
  const nowSeconds = Math.floor((options.now ?? new Date()).getTime() / 1_000);
  const maxAgeSeconds = options.maxAgeSeconds ?? getTelegramInitDataMaxAgeSeconds();
  const futureToleranceSeconds = options.futureToleranceSeconds ?? 30;

  if (authDateSeconds > nowSeconds + futureToleranceSeconds) {
    throw new TelegramAuthError("FUTURE_INIT_DATA");
  }
  if (nowSeconds - authDateSeconds > maxAgeSeconds) {
    throw new TelegramAuthError("EXPIRED_INIT_DATA");
  }

  const rawUser = params.get("user");
  if (!rawUser) throw new TelegramAuthError("INVALID_INIT_DATA");

  return parseTelegramUser(rawUser);
}

export function hashTelegramSessionToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function getTelegramSessionCookieName() {
  return process.env.NODE_ENV === "production"
    ? "__Host-yori-telegram-session"
    : "yori-telegram-session";
}

export function getTelegramSessionCookieOptions(ttlSeconds = getTelegramSessionTtlSeconds()) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: ttlSeconds,
    priority: "high" as const,
  };
}

export async function createTelegramSession(identity: VerifiedTelegramIdentity) {
  const token = randomBytes(32).toString("base64url");
  const tokenHash = hashTelegramSessionToken(token);
  const ttlSeconds = getTelegramSessionTtlSeconds();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + ttlSeconds * 1_000);

  const user = await prisma.$transaction(async (transaction) => {
    const savedUser = await transaction.telegramUser.upsert({
      where: { telegramId: identity.telegramId },
      create: {
        telegramId: identity.telegramId,
        firstName: identity.firstName,
        lastName: identity.lastName,
        username: identity.username,
        languageCode: identity.languageCode,
        lastSeenAt: now,
      },
      update: {
        firstName: identity.firstName,
        lastName: identity.lastName,
        username: identity.username,
        languageCode: identity.languageCode,
        lastSeenAt: now,
      },
      select: {
        id: true,
        telegramId: true,
        firstName: true,
        lastName: true,
        username: true,
        languageCode: true,
        allowPrivateTest: true,
        isBlocked: true,
      },
    });

    if (savedUser.isBlocked) throw new TelegramAuthError("BLOCKED_USER");

    await transaction.telegramSession.deleteMany({
      where: { userId: savedUser.id, expiresAt: { lte: now } },
    });
    await transaction.telegramSession.create({
      data: { tokenHash, userId: savedUser.id, expiresAt },
    });

    return savedUser;
  });

  return {
    token,
    ttlSeconds,
    owner: {
      userId: user.id,
      telegramId: user.telegramId,
      firstName: user.firstName,
      lastName: user.lastName,
      username: user.username,
      languageCode: user.languageCode,
      allowPrivateTest: user.allowPrivateTest,
    } satisfies TelegramSessionOwner,
  };
}

export async function findTelegramSession(token: string | undefined) {
  if (!token || token.length > 128) return null;

  const session = await prisma.telegramSession.findUnique({
    where: { tokenHash: hashTelegramSessionToken(token) },
    select: {
      expiresAt: true,
      revokedAt: true,
      user: {
        select: {
          id: true,
          telegramId: true,
          firstName: true,
          lastName: true,
          username: true,
          languageCode: true,
          allowPrivateTest: true,
          isBlocked: true,
        },
      },
    },
  });

  if (
    !session ||
    session.revokedAt ||
    session.expiresAt.getTime() <= Date.now() ||
    session.user.isBlocked
  ) {
    return null;
  }

  return {
    userId: session.user.id,
    telegramId: session.user.telegramId,
    firstName: session.user.firstName,
    lastName: session.user.lastName,
    username: session.user.username,
    languageCode: session.user.languageCode,
    allowPrivateTest: session.user.allowPrivateTest,
  } satisfies TelegramSessionOwner;
}

export async function getCurrentTelegramSession() {
  const cookieStore = await cookies();
  return findTelegramSession(cookieStore.get(getTelegramSessionCookieName())?.value);
}
