import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  getOptionalTelegramManagerChatId,
  parseTelegramBotConfig,
  TelegramBotConfigError,
} from "@/lib/telegram/bot-config";

const fakeToken = ["123456789", "A".repeat(35)].join(":");
const validEnvironment = {
  TELEGRAM_BOT_TOKEN: fakeToken,
  TELEGRAM_BOT_USERNAME: "YoriDeliveryBot",
  TELEGRAM_WEBHOOK_SECRET: "s".repeat(32),
  TELEGRAM_MANAGER_CHAT_ID: "-1001234567890",
  NEXT_PUBLIC_APP_URL: "https://yori.example",
};

describe("Telegram bot configuration", () => {
  it("parses a complete configuration without converting chat IDs to numbers", () => {
    expect(parseTelegramBotConfig(validEnvironment)).toEqual({
      token: fakeToken,
      botId: 123456789,
      username: "YoriDeliveryBot",
      appUrl: "https://yori.example",
      webhookSecret: "s".repeat(32),
      managerChatId: "-1001234567890",
    });
  });

  it("fails closed and reports only invalid variable names", () => {
    let error: unknown;
    try {
      parseTelegramBotConfig({
        ...validEnvironment,
        TELEGRAM_BOT_TOKEN: "exposed-value",
        TELEGRAM_WEBHOOK_SECRET: "short",
      });
    } catch (caught) {
      error = caught;
    }

    expect(error).toBeInstanceOf(TelegramBotConfigError);
    expect(error).toMatchObject({
      invalidKeys: ["TELEGRAM_BOT_TOKEN", "TELEGRAM_WEBHOOK_SECRET"],
    });
    expect(String(error)).not.toContain("exposed-value");
  });

  it("rejects non-HTTPS, placeholder and non-origin Web App URLs", () => {
    for (const appUrl of [
      "http://yori.example",
      "https://your-app.vercel.app",
      "https://yori.example/path",
      "https://yori.example/?token=value",
    ]) {
      expect(() => parseTelegramBotConfig({
        ...validEnvironment,
        NEXT_PUBLIC_APP_URL: appUrl,
      })).toThrowError(expect.objectContaining({ invalidKeys: ["NEXT_PUBLIC_APP_URL"] }));
    }
  });

  it("rejects Telegram usernames with an at-sign or without the bot suffix", () => {
    for (const username of ["@YoriDeliveryBot", "YoriDelivery"]) {
      expect(() => parseTelegramBotConfig({
        ...validEnvironment,
        TELEGRAM_BOT_USERNAME: username,
      })).toThrow(TelegramBotConfigError);
    }
  });

  it("reads an optional manager target without exposing or coercing the chat ID", () => {
    expect(getOptionalTelegramManagerChatId(validEnvironment)).toBe("-1001234567890");
    expect(getOptionalTelegramManagerChatId({ TELEGRAM_MANAGER_CHAT_ID: "not-a-chat" })).toBeNull();
    expect(getOptionalTelegramManagerChatId({})).toBeNull();
  });
});
