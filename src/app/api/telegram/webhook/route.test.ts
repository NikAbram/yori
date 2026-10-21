import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  handleUpdate: vi.fn(),
  processTelegramUpdate: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    processedTelegramUpdate: {
      createMany: vi.fn(),
      deleteMany: vi.fn(),
    },
  },
}));
vi.mock("@/services/telegram-bot", () => ({
  createYoriTelegramBot: () => ({ handleUpdate: mocks.handleUpdate }),
}));
vi.mock("@/services/telegram-webhook", async (importOriginal) => {
  const original = await importOriginal<
    typeof import("@/services/telegram-webhook")
  >();
  return {
    ...original,
    processTelegramUpdate: mocks.processTelegramUpdate,
  };
});

import { POST } from "@/app/api/telegram/webhook/route";

const secret = "s".repeat(32);

function request(
  body = JSON.stringify({ update_id: 42 }),
  headers: Record<string, string> = {},
) {
  return new Request("https://yori.example/api/telegram/webhook", {
    method: "POST",
    body,
    headers: {
      "content-type": "application/json",
      "x-telegram-bot-api-secret-token": secret,
      ...headers,
    },
  });
}

describe("POST /api/telegram/webhook", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  beforeEach(() => {
    vi.stubEnv("TELEGRAM_BOT_TOKEN", `${123456789}:${"A".repeat(35)}`);
    vi.stubEnv("TELEGRAM_BOT_USERNAME", "YoriDeliveryBot");
    vi.stubEnv("TELEGRAM_WEBHOOK_SECRET", secret);
    vi.stubEnv("TELEGRAM_MANAGER_CHAT_ID", "-1001234567890");
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://yori.example");
    mocks.handleUpdate.mockReset().mockResolvedValue(undefined);
    mocks.processTelegramUpdate.mockReset().mockImplementation(
      async (update, handler) => {
        await handler(update);
        return { duplicate: false };
      },
    );
  });

  it("rejects an invalid secret before parsing the body", async () => {
    const response = await POST(request("not-json", {
      "x-telegram-bot-api-secret-token": "wrong",
    }));

    expect(response.status).toBe(401);
    expect(mocks.processTelegramUpdate).not.toHaveBeenCalled();
  });

  it("rejects an unsupported content type", async () => {
    const response = await POST(request("update_id=42", {
      "content-type": "application/x-www-form-urlencoded",
    }));

    expect(response.status).toBe(415);
  });

  it("rejects malformed JSON and invalid updates", async () => {
    const malformed = await POST(request("{"));
    const invalid = await POST(request(JSON.stringify({ update_id: "42" })));

    expect(malformed.status).toBe(400);
    expect(invalid.status).toBe(400);
  });

  it("rejects a body declared above the strict size limit", async () => {
    const response = await POST(request(JSON.stringify({ update_id: 42 }), {
      "content-length": String(128 * 1024 + 1),
    }));

    expect(response.status).toBe(413);
  });

  it("stops reading a streamed body that exceeds the size limit", async () => {
    const oversizedBody = JSON.stringify({
      update_id: 42,
      padding: "x".repeat(128 * 1024),
    });
    const response = await POST(request(oversizedBody));

    expect(response.status).toBe(413);
    expect(mocks.processTelegramUpdate).not.toHaveBeenCalled();
  });

  it("processes a valid update and returns a non-cacheable success", async () => {
    const response = await POST(request());

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true });
    expect(response.headers.get("cache-control")).toBe("no-store, private");
    expect(mocks.handleUpdate).toHaveBeenCalledWith({ update_id: 42 });
  });

  it("acknowledges a duplicate without invoking the bot again", async () => {
    mocks.processTelegramUpdate.mockResolvedValue({ duplicate: true });

    const response = await POST(request());

    expect(response.status).toBe(200);
    expect(mocks.handleUpdate).not.toHaveBeenCalled();
  });

  it("returns a retryable failure without exposing internal details", async () => {
    mocks.processTelegramUpdate.mockRejectedValue(
      new Error("database.example.internal"),
    );

    const response = await POST(request());

    expect(response.status).toBe(503);
    expect(await response.text()).not.toContain("database.example.internal");
  });

  it("fails closed when server configuration is invalid", async () => {
    vi.stubEnv("TELEGRAM_WEBHOOK_SECRET", "short");

    const response = await POST(request());

    expect(response.status).toBe(503);
    expect(mocks.processTelegramUpdate).not.toHaveBeenCalled();
  });
});
