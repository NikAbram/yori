import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  cookieSet: vi.fn(),
  createTelegramSession: vi.fn(),
  verifyTelegramInitData: vi.fn(),
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn().mockResolvedValue({ set: mocks.cookieSet }),
}));
vi.mock("@/services/telegram-auth", () => {
  class TelegramAuthError extends Error {}
  return {
    TELEGRAM_INIT_DATA_MAX_LENGTH: 8_192,
    TelegramAuthError,
    createTelegramSession: mocks.createTelegramSession,
    getTelegramSessionCookieName: () => "yori-telegram-session",
    getTelegramSessionCookieOptions: () => ({ httpOnly: true, sameSite: "lax", path: "/" }),
    verifyTelegramInitData: mocks.verifyTelegramInitData,
  };
});

import { POST } from "@/app/api/auth/telegram/route";
import { TelegramAuthError } from "@/services/telegram-auth";

function authRequest(initData = "signed-init-data", origin = "https://yori.test") {
  return new Request("https://yori.test/api/auth/telegram", {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: origin },
    body: JSON.stringify({ initData }),
  });
}

describe("Telegram authentication route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("TELEGRAM_BOT_TOKEN", "test-token");
    mocks.verifyTelegramInitData.mockReturnValue({ telegramId: "42", firstName: "Юки" });
    mocks.createTelegramSession.mockResolvedValue({
      token: "opaque-token",
      ttlSeconds: 86_400,
      owner: { firstName: "Юки", username: "yuki" },
    });
  });

  it("creates an HttpOnly server session from same-origin verified init data", async () => {
    const response = await POST(authRequest());

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      authenticated: true,
      user: { firstName: "Юки", username: "yuki" },
    });
    expect(mocks.verifyTelegramInitData).toHaveBeenCalledWith("signed-init-data", "test-token");
    expect(mocks.cookieSet).toHaveBeenCalledWith(
      "yori-telegram-session",
      "opaque-token",
      expect.objectContaining({ httpOnly: true, sameSite: "lax" }),
    );
    expect(response.headers.get("cache-control")).toBe("no-store, private");
  });

  it("rejects a cross-origin session creation request", async () => {
    const response = await POST(authRequest("signed-init-data", "https://attacker.example"));

    expect(response.status).toBe(403);
    expect(mocks.verifyTelegramInitData).not.toHaveBeenCalled();
  });

  it("returns one generic authentication error for invalid Telegram data", async () => {
    mocks.verifyTelegramInitData.mockImplementation(() => {
      throw new TelegramAuthError("INVALID_INIT_DATA");
    });

    const response = await POST(authRequest("tampered-init-data"));

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      error: "Не удалось подтвердить Telegram-сессию.",
    });
    expect(mocks.createTelegramSession).not.toHaveBeenCalled();
  });

  it("rejects oversized bodies before parsing them", async () => {
    const request = authRequest();
    request.headers.set("content-length", "9000");

    const response = await POST(request);

    expect(response.status).toBe(413);
    expect(mocks.verifyTelegramInitData).not.toHaveBeenCalled();
  });
});
