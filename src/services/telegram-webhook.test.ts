import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Update } from "grammy/types";

const mocks = vi.hoisted(() => ({
  createMany: vi.fn(),
  deleteMany: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    processedTelegramUpdate: {
      createMany: mocks.createMany,
      deleteMany: mocks.deleteMany,
    },
  },
}));

import {
  parseTelegramUpdate,
  processTelegramUpdate,
  verifyTelegramWebhookSecret,
} from "@/services/telegram-webhook";

const update: Update = {
  update_id: 42,
  message: {
    message_id: 1,
    date: 1_700_000_000,
    from: { id: 123, is_bot: false, first_name: "Test" },
    chat: { id: 123, type: "private", first_name: "Test" },
    text: "/start",
  },
};

describe("Telegram webhook service", () => {
  beforeEach(() => {
    mocks.createMany.mockReset().mockResolvedValue({ count: 1 });
    mocks.deleteMany.mockReset().mockResolvedValue({ count: 1 });
  });

  it("compares the webhook secret without requiring equal input lengths", () => {
    const expected = "s".repeat(32);

    expect(verifyTelegramWebhookSecret(expected, expected)).toBe(true);
    expect(verifyTelegramWebhookSecret("wrong", expected)).toBe(false);
    expect(verifyTelegramWebhookSecret(null, expected)).toBe(false);
  });

  it("accepts an update with a safe non-negative integer id", () => {
    expect(parseTelegramUpdate(update)).toEqual(update);
  });

  it.each([
    null,
    {},
    { update_id: -1 },
    { update_id: 1.5 },
    { update_id: "42" },
    { update_id: Number.MAX_SAFE_INTEGER + 1 },
  ])("rejects an invalid update payload: %j", (payload) => {
    expect(() => parseTelegramUpdate(payload)).toThrow();
  });

  it("claims and handles a new update once", async () => {
    const handleUpdate = vi.fn().mockResolvedValue(undefined);

    await expect(processTelegramUpdate(update, handleUpdate)).resolves.toEqual({
      duplicate: false,
    });
    expect(mocks.createMany).toHaveBeenCalledWith({
      data: { updateId: BigInt(42) },
      skipDuplicates: true,
    });
    expect(handleUpdate).toHaveBeenCalledOnce();
    expect(mocks.deleteMany).not.toHaveBeenCalled();
  });

  it("acknowledges a duplicate without handling it again", async () => {
    mocks.createMany.mockResolvedValue({ count: 0 });
    const handleUpdate = vi.fn();

    await expect(processTelegramUpdate(update, handleUpdate)).resolves.toEqual({
      duplicate: true,
    });
    expect(handleUpdate).not.toHaveBeenCalled();
  });

  it("releases the claim after a handling failure so Telegram can retry", async () => {
    const failure = new Error("Telegram API unavailable");
    const handleUpdate = vi.fn().mockRejectedValue(failure);

    await expect(processTelegramUpdate(update, handleUpdate)).rejects.toBe(failure);
    expect(mocks.deleteMany).toHaveBeenCalledWith({
      where: { updateId: BigInt(42) },
    });
  });

  it("does not hide an unexpected database claim failure", async () => {
    const failure = new Error("Database unavailable");
    mocks.createMany.mockRejectedValue(failure);

    await expect(processTelegramUpdate(update, vi.fn())).rejects.toBe(failure);
  });
});
