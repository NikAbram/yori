import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  createTelegramBot,
  getTelegramMenuButton,
  getTelegramWebAppUrl,
  getTelegramWebhookUrl,
} from "@/lib/telegram/bot";
import type { TelegramBotConfig } from "@/lib/telegram/bot-config";

const config: TelegramBotConfig = {
  token: ["123456789", "A".repeat(35)].join(":"),
  botId: 123456789,
  username: "YoriDeliveryBot",
  appUrl: "https://yori.example",
  webhookSecret: "s".repeat(32),
  managerChatId: "-1001234567890",
};

describe("Telegram bot foundation", () => {
  it("pre-initializes grammY with bot information for serverless requests", () => {
    const bot = createTelegramBot(config);

    expect(bot.botInfo).toMatchObject({
      id: 123456789,
      is_bot: true,
      first_name: "YŌRI",
      username: "YoriDeliveryBot",
    });
  });

  it("builds root-relative Mini App and webhook URLs", () => {
    expect(getTelegramWebAppUrl(config)).toBe("https://yori.example/");
    expect(getTelegramWebAppUrl(config, "/orders")).toBe("https://yori.example/orders");
    expect(getTelegramWebhookUrl(config)).toBe("https://yori.example/api/telegram/webhook");
    expect(() => getTelegramWebAppUrl(config, "https://attacker.example"))
      .toThrow("root-relative");
    expect(() => getTelegramWebAppUrl(config, "/\\attacker.example"))
      .toThrow("configured origin");
  });

  it("builds the Bot API Menu Button payload without making a request", () => {
    expect(getTelegramMenuButton(config)).toEqual({
      type: "web_app",
      text: "Открыть меню",
      web_app: { url: "https://yori.example/" },
    });
  });
});
