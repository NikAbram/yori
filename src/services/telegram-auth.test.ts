import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  transaction: vi.fn(),
  sessionFindUnique: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({ cookies: vi.fn() }));
vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    $transaction: mocks.transaction,
    telegramSession: { findUnique: mocks.sessionFindUnique },
  },
}));

import {
  buildTelegramDataCheckString,
  calculateTelegramInitDataHash,
  createTelegramSession,
  findTelegramSession,
  getTelegramSessionCookieName,
  getTelegramSessionCookieOptions,
  hashTelegramSessionToken,
  TelegramAuthError,
  verifyTelegramInitData,
} from "@/services/telegram-auth";

const BOT_TOKEN = "123456789:test-token";
const NOW = new Date("2026-10-20T12:00:00.000Z");

function signedInitData(overrides: Record<string, string> = {}) {
  const values = {
    auth_date: String(Math.floor(NOW.getTime() / 1_000) - 10),
    query_id: "AAExample",
    user: JSON.stringify({
      id: 9007199254740991,
      first_name: "Юки",
      last_name: "Мори",
      username: "yuki",
      language_code: "ru",
    }),
    ...overrides,
  };
  const params = new URLSearchParams(values);
  params.set("hash", calculateTelegramInitDataHash(buildTelegramDataCheckString(params), BOT_TOKEN));
  return params.toString();
}

describe("Telegram initData verification", () => {
  it("verifies the HMAC and returns only the trusted identity", () => {
    expect(verifyTelegramInitData(signedInitData(), BOT_TOKEN, { now: NOW })).toEqual({
      telegramId: "9007199254740991",
      firstName: "Юки",
      lastName: "Мори",
      username: "yuki",
      languageCode: "ru",
    });
  });

  it("serializes the Telegram ID from the signed JSON without numeric precision loss", () => {
    const params = new URLSearchParams({
      auth_date: String(Math.floor(NOW.getTime() / 1_000) - 10),
      user: '{"id":4503599627370495,"first_name":"Юки"}',
    });
    params.set("hash", calculateTelegramInitDataHash(buildTelegramDataCheckString(params), BOT_TOKEN));

    expect(verifyTelegramInitData(params.toString(), BOT_TOKEN, { now: NOW }).telegramId).toBe(
      "4503599627370495",
    );
  });

  it("matches Telegram's published HMAC example", () => {
    const token = "5768337691:AAH5YkoiEuPk8-FZa32hStHTqXiLPtAEhx8";
    const check = [
      "auth_date=1662771648",
      "query_id=AAHdF6IQAAAAAN0XohDhrOrc",
      'user={"id":279058397,"first_name":"Vladislav","last_name":"Kibenko","username":"vdkfrost","language_code":"ru","is_premium":true}',
    ].join("\n");

    expect(calculateTelegramInitDataHash(check, token)).toBe(
      "c501b71e775f74ce10e377dea85a7ea24ecd640b223ea86dfe453e0eaed2e2b2",
    );
  });

  it("rejects a malformed hash before comparing it", () => {
    const params = new URLSearchParams(signedInitData());
    params.set("hash", "not-a-telegram-hash");
    expect(() => verifyTelegramInitData(params.toString(), BOT_TOKEN, { now: NOW })).toThrow(
      TelegramAuthError,
    );
  });

  it("rejects tampered signed fields", () => {
    const params = new URLSearchParams(signedInitData());
    params.set("user", JSON.stringify({ id: 42, first_name: "Attacker" }));
    expect(() => verifyTelegramInitData(params.toString(), BOT_TOKEN, { now: NOW })).toThrow(
      TelegramAuthError,
    );
  });

  it("rejects expired init data", () => {
    const authDate = String(Math.floor(NOW.getTime() / 1_000) - 3_601);
    expect(() =>
      verifyTelegramInitData(signedInitData({ auth_date: authDate }), BOT_TOKEN, {
        now: NOW,
        maxAgeSeconds: 3_600,
      }),
    ).toThrowError(expect.objectContaining({ code: "EXPIRED_INIT_DATA" }));
  });

  it("rejects init data dated too far in the future", () => {
    const authDate = String(Math.floor(NOW.getTime() / 1_000) + 31);
    expect(() => verifyTelegramInitData(signedInitData({ auth_date: authDate }), BOT_TOKEN, { now: NOW }))
      .toThrowError(expect.objectContaining({ code: "FUTURE_INIT_DATA" }));
  });

  it("rejects duplicate fields", () => {
    const duplicated = `${signedInitData()}&auth_date=1`;
    expect(() => verifyTelegramInitData(duplicated, BOT_TOKEN, { now: NOW })).toThrow(TelegramAuthError);
  });
});

describe("Telegram server sessions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
  });

  it("stores only a hash of a random opaque token", async () => {
    const user = {
      id: "user-id",
      telegramId: "42",
      firstName: "Юки",
      lastName: null,
      username: null,
      languageCode: "ru",
      allowPrivateTest: true,
      isBlocked: false,
    };
    const transaction = {
      telegramUser: { upsert: vi.fn().mockResolvedValue(user) },
      telegramSession: {
        deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
        create: vi.fn().mockResolvedValue({}),
      },
    };
    mocks.transaction.mockImplementation((callback) => callback(transaction));

    const session = await createTelegramSession({
      telegramId: "42",
      firstName: "Юки",
      lastName: null,
      username: null,
      languageCode: "ru",
    });

    const createCall = transaction.telegramSession.create.mock.calls[0][0];
    expect(session.token).toHaveLength(43);
    expect(createCall.data.tokenHash).toBe(hashTelegramSessionToken(session.token));
    expect(createCall.data.tokenHash).not.toBe(session.token);
    expect(session.owner.telegramId).toBe("42");
  });

  it("does not create a session for a blocked user", async () => {
    const transaction = {
      telegramUser: { upsert: vi.fn().mockResolvedValue({ isBlocked: true }) },
      telegramSession: { deleteMany: vi.fn(), create: vi.fn() },
    };
    mocks.transaction.mockImplementation((callback) => callback(transaction));

    await expect(
      createTelegramSession({
        telegramId: "42",
        firstName: "Юки",
        lastName: null,
        username: null,
        languageCode: "ru",
      }),
    ).rejects.toThrowError(expect.objectContaining({ code: "BLOCKED_USER" }));
    expect(transaction.telegramSession.create).not.toHaveBeenCalled();
  });

  it("accepts only active, unrevoked sessions of unblocked users", async () => {
    mocks.sessionFindUnique.mockResolvedValue({
      expiresAt: new Date(Date.now() + 60_000),
      revokedAt: null,
      user: {
        id: "user-id",
        telegramId: "42",
        firstName: "Юки",
        lastName: null,
        username: null,
        languageCode: "ru",
        allowPrivateTest: false,
        isBlocked: false,
      },
    });

    await expect(findTelegramSession("opaque-token")).resolves.toEqual(
      expect.objectContaining({ userId: "user-id", telegramId: "42" }),
    );
    expect(mocks.sessionFindUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { tokenHash: hashTelegramSessionToken("opaque-token") } }),
    );
  });

  it("uses an HttpOnly, SameSite cookie and Secure in production", () => {
    vi.stubEnv("NODE_ENV", "production");

    expect(getTelegramSessionCookieName()).toBe("__Host-yori-telegram-session");
    expect(getTelegramSessionCookieOptions()).toEqual(
      expect.objectContaining({ httpOnly: true, secure: true, sameSite: "lax", path: "/" }),
    );
  });
});

describe("session hashing", () => {
  it("produces the expected SHA-256 hash", () => {
    expect(hashTelegramSessionToken("token")).toBe(
      "3c469e9d6c5875d37a43f353d4f88e61fcf812c66eee3457465a40b0da4153e0",
    );
  });
});
