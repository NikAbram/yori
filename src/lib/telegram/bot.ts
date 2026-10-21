import "server-only";

import { Bot } from "grammy";
import type { MenuButton } from "grammy/types";

import {
  getTelegramBotConfig,
  type TelegramBotConfig,
} from "@/lib/telegram/bot-config";

const BOT_DISPLAY_NAME = "YŌRI";
const TELEGRAM_API_TIMEOUT_SECONDS = 8;
export const TELEGRAM_WEBHOOK_PATH = "/api/telegram/webhook";

export function createTelegramBot(config = getTelegramBotConfig()) {
  return new Bot(config.token, {
    client: { timeoutSeconds: TELEGRAM_API_TIMEOUT_SECONDS },
    botInfo: {
      id: config.botId,
      is_bot: true,
      first_name: BOT_DISPLAY_NAME,
      username: config.username,
      can_join_groups: false,
      can_read_all_group_messages: false,
      supports_inline_queries: false,
      can_connect_to_business: false,
      has_main_web_app: false,
      has_topics_enabled: false,
      allows_users_to_create_topics: false,
      can_manage_bots: false,
      supports_join_request_queries: false,
    },
  });
}

export function getTelegramWebAppUrl(
  config: Pick<TelegramBotConfig, "appUrl">,
  pathname = "/",
) {
  if (!pathname.startsWith("/") || pathname.startsWith("//")) {
    throw new TypeError("Telegram Web App pathname must be root-relative.");
  }

  const url = new URL(pathname, `${config.appUrl}/`);
  if (url.origin !== config.appUrl) {
    throw new TypeError("Telegram Web App pathname must stay on the configured origin.");
  }

  return url.toString();
}

export function getTelegramWebhookUrl(config: Pick<TelegramBotConfig, "appUrl">) {
  return getTelegramWebAppUrl(config, TELEGRAM_WEBHOOK_PATH);
}

export function getTelegramMenuButton(
  config: Pick<TelegramBotConfig, "appUrl">,
): MenuButton {
  return {
    type: "web_app",
    text: "Открыть меню",
    web_app: { url: getTelegramWebAppUrl(config) },
  };
}
