import { ZodError } from "zod";

import {
  privateJson,
  readBoundedJson,
  requestHasJsonContentType,
} from "@/lib/server-request";
import {
  parseTelegramBotConfig,
  TelegramBotConfigError,
} from "@/lib/telegram/bot-config";
import { createYoriTelegramBot } from "@/services/telegram-bot";
import {
  parseTelegramUpdate,
  processTelegramUpdate,
  verifyTelegramWebhookSecret,
} from "@/services/telegram-webhook";

const MAX_TELEGRAM_WEBHOOK_BYTES = 128 * 1024;

export async function POST(request: Request) {
  let config;

  try {
    config = parseTelegramBotConfig(process.env);
  } catch (error) {
    if (error instanceof TelegramBotConfigError) {
      return privateJson({ error: "Webhook unavailable." }, 503);
    }
    throw error;
  }

  const receivedSecret = request.headers.get(
    "x-telegram-bot-api-secret-token",
  );
  if (!verifyTelegramWebhookSecret(receivedSecret, config.webhookSecret)) {
    return privateJson({ error: "Unauthorized." }, 401);
  }

  if (!requestHasJsonContentType(request)) {
    return privateJson({ error: "Unsupported media type." }, 415);
  }

  let update;
  try {
    const input = await readBoundedJson(request, MAX_TELEGRAM_WEBHOOK_BYTES);
    update = parseTelegramUpdate(input);
  } catch (error) {
    if (error instanceof RangeError) {
      return privateJson({ error: "Payload too large." }, 413);
    }
    if (error instanceof SyntaxError || error instanceof ZodError) {
      return privateJson({ error: "Invalid payload." }, 400);
    }
    throw error;
  }

  try {
    const bot = createYoriTelegramBot(config);
    await processTelegramUpdate(update, (claimedUpdate) => (
      bot.handleUpdate(claimedUpdate)
    ));
    return privateJson({ ok: true });
  } catch {
    return privateJson({ error: "Webhook processing failed." }, 503);
  }
}
