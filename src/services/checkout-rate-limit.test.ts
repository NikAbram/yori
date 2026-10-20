import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ upsert: vi.fn() }));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db/prisma", () => ({
  prisma: { rateLimitBucket: { upsert: mocks.upsert } },
}));

import { CheckoutRateLimitError, consumeCheckoutRateLimit } from "@/services/checkout-rate-limit";

describe("checkout rate limit", () => {
  beforeEach(() => vi.clearAllMocks());

  it("increments a database bucket without storing the raw user id", async () => {
    mocks.upsert.mockResolvedValue({ count: 1 });
    await consumeCheckoutRateLimit("user-id", new Date("2026-10-20T12:03:00Z"));

    const call = mocks.upsert.mock.calls[0][0];
    expect(call.create.subjectHash).toMatch(/^[a-f\d]{64}$/);
    expect(call.create.subjectHash).not.toContain("user-id");
    expect(call.update).toEqual(expect.objectContaining({ count: { increment: 1 } }));
  });

  it("rejects attempts above the limit with a retry time", async () => {
    mocks.upsert.mockResolvedValue({ count: 6 });

    await expect(
      consumeCheckoutRateLimit("user-id", new Date("2026-10-20T12:03:00Z")),
    ).rejects.toBeInstanceOf(CheckoutRateLimitError);
  });
});
