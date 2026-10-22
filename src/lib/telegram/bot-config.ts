import "server-only";

import { z } from "zod";

const BOT_TOKEN_PATTERN = /^([1-9]\d{4,19}):[A-Za-z0-9_-]{30,}$/;
const BOT_USERNAME_PATTERN = /^(?=.{5,32}$)[A-Za-z][A-Za-z0-9_]*bot$/i;
const WEBHOOK_SECRET_PATTERN = /^[A-Za-z0-9_-]{32,256}$/;
const TELEGRAM_CHAT_ID_PATTERN = /^-?[1-9]\d{0,19}$/;
const PLACEHOLDER_APP_HOSTS = new Set(["your-app.vercel.app"]);

const telegramBotEnvironmentSchema = z.object({
  TELEGRAM_BOT_TOKEN: z.string().trim().regex(BOT_TOKEN_PATTERN),
  TELEGRAM_BOT_USERNAME: z.string().trim().regex(BOT_USERNAME_PATTERN),
  TELEGRAM_WEBHOOK_SECRET: z.string().trim().regex(WEBHOOK_SECRET_PATTERN),
  TELEGRAM_MANAGER_CHAT_ID: z.string().trim().regex(TELEGRAM_CHAT_ID_PATTERN),
  NEXT_PUBLIC_APP_URL: z.string().trim().url(),
});

export type TelegramBotConfig = {
  token: string;
  botId: number;
  username: string;
  appUrl: string;
  webhookSecret: string;
  managerChatId: string;
};

export class TelegramBotConfigError extends Error {
  constructor(public readonly invalidKeys: string[]) {
    super(`Telegram bot configuration is invalid: ${invalidKeys.join(", ")}.`);
    this.name = "TelegramBotConfigError";
  }
}

function normalizeAppUrl(rawUrl: string) {
  const url = new URL(rawUrl);
  const isInvalid = url.protocol !== "https:"
    || Boolean(url.username || url.password || url.search || url.hash)
    || url.pathname !== "/"
    || PLACEHOLDER_APP_HOSTS.has(url.hostname.toLowerCase());

  if (isInvalid) throw new TelegramBotConfigError(["NEXT_PUBLIC_APP_URL"]);
  return url.origin;
}

export function parseTelegramBotConfig(
  environment: Record<string, string | undefined> = process.env,
): TelegramBotConfig {
  const parsed = telegramBotEnvironmentSchema.safeParse(environment);
  if (!parsed.success) {
    const invalidKeys = [...new Set(parsed.error.issues.map((issue) => String(issue.path[0])))]
      .sort();
    throw new TelegramBotConfigError(invalidKeys);
  }

  const tokenMatch = BOT_TOKEN_PATTERN.exec(parsed.data.TELEGRAM_BOT_TOKEN);
  const botId = Number(tokenMatch?.[1]);
  if (!Number.isSafeInteger(botId)) {
    throw new TelegramBotConfigError(["TELEGRAM_BOT_TOKEN"]);
  }

  return {
    token: parsed.data.TELEGRAM_BOT_TOKEN,
    botId,
    username: parsed.data.TELEGRAM_BOT_USERNAME,
    appUrl: normalizeAppUrl(parsed.data.NEXT_PUBLIC_APP_URL),
    webhookSecret: parsed.data.TELEGRAM_WEBHOOK_SECRET,
    managerChatId: parsed.data.TELEGRAM_MANAGER_CHAT_ID,
  };
}

export function getTelegramBotConfig() {
  return parseTelegramBotConfig(process.env);
}

export function getOptionalTelegramManagerChatId(
  environment: Record<string, string | undefined> = process.env,
) {
  const value = environment.TELEGRAM_MANAGER_CHAT_ID?.trim();
  return value && TELEGRAM_CHAT_ID_PATTERN.test(value) ? value : null;
}
