import "server-only";

import { type Bot, type Context, InlineKeyboard } from "grammy";
import type { BotCommand } from "grammy/types";

import { createTelegramBot, getTelegramWebAppUrl } from "@/lib/telegram/bot";
import {
  getTelegramBotConfig,
  parseTelegramBotConfig,
  type TelegramBotConfig,
  TelegramBotConfigError,
} from "@/lib/telegram/bot-config";

export const TELEGRAM_BOT_COMMANDS = [
  { command: "start", description: "Открыть YŌRI" },
  { command: "help", description: "Как оформить заказ" },
  { command: "orders", description: "Мои заказы" },
] satisfies BotCommand[];

const PRIVATE_CHAT_ONLY_TEXT = "Откройте личный чат с ботом YŌRI, чтобы запустить приложение.";

function menuKeyboard(config: TelegramBotConfig) {
  return new InlineKeyboard()
    .webApp("🍣 Открыть меню", getTelegramWebAppUrl(config))
    .row()
    .webApp("Мои заказы", getTelegramWebAppUrl(config, "/orders"));
}

function ordersKeyboard(config: TelegramBotConfig) {
  return new InlineKeyboard()
    .webApp("Открыть мои заказы", getTelegramWebAppUrl(config, "/orders"));
}

function helpKeyboard(config: TelegramBotConfig) {
  return new InlineKeyboard()
    .webApp("Перейти в каталог", getTelegramWebAppUrl(config, "/catalog"));
}

async function replyInPrivateChat(
  context: Context,
  reply: () => Promise<unknown>,
) {
  if (context.chat?.type !== "private") {
    await context.reply(PRIVATE_CHAT_ONLY_TEXT);
    return;
  }

  await reply();
}

export function registerTelegramBotCommands(
  bot: Bot,
  config: TelegramBotConfig,
) {
  bot.command("start", async (context) => {
    await replyInPrivateChat(context, () => context.reply(
      "Добро пожаловать в YŌRI. Откройте меню, чтобы посмотреть каталог. Оформление доступно после проверки Telegram-сессии и текущего режима приёма заказов.",
      { reply_markup: menuKeyboard(config) },
    ));
  });

  bot.command("help", async (context) => {
    await replyInPrivateChat(context, () => context.reply(
      "Как оформить заказ:\n1. Откройте каталог и соберите корзину.\n2. Проверьте состав и актуальную сумму.\n3. Заполните адрес и подтвердите заказ.\n\nЕсли приём заказов закрыт, каталог всё равно остаётся доступен для просмотра.",
      { reply_markup: helpKeyboard(config) },
    ));
  });

  bot.command("orders", async (context) => {
    await replyInPrivateChat(context, () => context.reply(
      "История заказов доступна внутри YŌRI после проверки Telegram-сессии.",
      { reply_markup: ordersKeyboard(config) },
    ));
  });

  return bot;
}

export function createYoriTelegramBot(config = getTelegramBotConfig()) {
  return registerTelegramBotCommands(createTelegramBot(config), config);
}

export function initializeYoriTelegramBot(
  environment: Record<string, string | undefined> = process.env,
) {
  try {
    const config = parseTelegramBotConfig(environment);
    return { configured: true as const, bot: createYoriTelegramBot(config) };
  } catch (error) {
    if (error instanceof TelegramBotConfigError) {
      return { configured: false as const };
    }
    throw error;
  }
}
