import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Update } from "grammy/types";

vi.mock("server-only", () => ({}));

import type { TelegramBotConfig } from "@/lib/telegram/bot-config";
import {
  createYoriTelegramBot,
  initializeYoriTelegramBot,
  TELEGRAM_BOT_COMMANDS,
} from "@/services/telegram-bot";

const config: TelegramBotConfig = {
  token: ["123456789", "A".repeat(35)].join(":"),
  botId: 123456789,
  username: "YoriDeliveryBot",
  appUrl: "https://yori.example",
  webhookSecret: "s".repeat(32),
  managerChatId: "-1001234567890",
};

type ApiCall = { method: string; payload: Record<string, unknown> };

function commandUpdate(command: string, updateId = 1, chatType: "private" | "group" = "private") {
  const text = `/${command}`;
  return {
    update_id: updateId,
    message: {
      message_id: updateId,
      date: 1_782_000_000,
      text,
      entities: [{ type: "bot_command", offset: 0, length: text.length }],
      from: { id: 42, is_bot: false, first_name: "Юки" },
      chat: chatType === "private"
        ? { id: 42, type: "private", first_name: "Юки" }
        : { id: -42, type: "group", title: "Test group" },
    },
  } satisfies Update;
}

function createMockedBot() {
  const calls: ApiCall[] = [];
  const bot = createYoriTelegramBot(config);
  bot.api.config.use(async (_previous, method, payload) => {
    calls.push({ method, payload: payload as Record<string, unknown> });
    return {
      ok: true,
      result: {
        message_id: calls.length,
        date: 1_782_000_000,
        chat: { id: 42, type: "private", first_name: "Юки" },
      },
    } as never;
  });
  return { bot, calls };
}

describe("Telegram bot commands", () => {
  beforeEach(() => vi.clearAllMocks());

  it("defines the public command list for BotFather or setMyCommands", () => {
    expect(TELEGRAM_BOT_COMMANDS).toEqual([
      { command: "start", description: "Открыть YŌRI" },
      { command: "help", description: "Как оформить заказ" },
      { command: "orders", description: "Мои заказы" },
    ]);
  });

  it("answers /start with menu and order Web App buttons", async () => {
    const { bot, calls } = createMockedBot();

    await bot.handleUpdate(commandUpdate("start"));

    expect(calls).toHaveLength(1);
    expect(calls[0]).toMatchObject({
      method: "sendMessage",
      payload: {
        chat_id: 42,
        reply_markup: {
          inline_keyboard: [
            [{ text: "🍣 Открыть меню", web_app: { url: "https://yori.example/" } }],
            [{ text: "Мои заказы", web_app: { url: "https://yori.example/orders" } }],
          ],
        },
      },
    });
  });

  it("answers /help without promising that ordering is available", async () => {
    const { bot, calls } = createMockedBot();

    await bot.handleUpdate(commandUpdate("help"));

    expect(calls[0]).toMatchObject({
      method: "sendMessage",
      payload: {
        text: expect.stringContaining("Если приём заказов закрыт"),
        reply_markup: {
          inline_keyboard: [[{
            text: "Перейти в каталог",
            web_app: { url: "https://yori.example/catalog" },
          }]],
        },
      },
    });
  });

  it("opens the authenticated order history from /orders", async () => {
    const { bot, calls } = createMockedBot();

    await bot.handleUpdate(commandUpdate("orders"));

    expect(calls[0]).toMatchObject({
      method: "sendMessage",
      payload: {
        text: expect.stringContaining("после проверки Telegram-сессии"),
        reply_markup: {
          inline_keyboard: [[{
            text: "Открыть мои заказы",
            web_app: { url: "https://yori.example/orders" },
          }]],
        },
      },
    });
  });

  it("does not send unsupported Web App buttons in group chats", async () => {
    const { bot, calls } = createMockedBot();

    await bot.handleUpdate(commandUpdate("start", 2, "group"));

    expect(calls[0]).toMatchObject({
      method: "sendMessage",
      payload: { text: expect.stringContaining("личный чат") },
    });
    expect(calls[0].payload).not.toHaveProperty("reply_markup");
  });

  it("exposes invalid Web App configuration as a controlled webhook-ready state", () => {
    expect(initializeYoriTelegramBot({
      TELEGRAM_BOT_TOKEN: config.token,
      TELEGRAM_BOT_USERNAME: config.username,
      TELEGRAM_WEBHOOK_SECRET: config.webhookSecret,
      TELEGRAM_MANAGER_CHAT_ID: config.managerChatId,
      NEXT_PUBLIC_APP_URL: "https://your-app.vercel.app",
    })).toEqual({ configured: false });
  });
});
