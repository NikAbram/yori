import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  redirect: vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`);
  }),
}));

vi.mock("next/headers", () => ({ headers: vi.fn(async () => new Headers()) }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("@/lib/auth", () => ({ auth: { api: { getSession: mocks.getSession } } }));
vi.mock("server-only", () => ({}));

import { getCurrentAdmin, requireCurrentAdmin } from "@/services/admin-auth";

describe("administrative authorization boundary", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns only the minimal active administrator identity", async () => {
    mocks.getSession.mockResolvedValue({
      user: {
        id: "7e27ec80-28ae-4d18-b1d6-15d452ecbaf4",
        email: "owner@example.com",
        name: "Владелец",
        role: "OWNER",
        isActive: true,
        image: "ignored",
      },
    });

    await expect(getCurrentAdmin()).resolves.toEqual({
      id: "7e27ec80-28ae-4d18-b1d6-15d452ecbaf4",
      email: "owner@example.com",
      name: "Владелец",
      role: "OWNER",
    });
  });

  it.each([
    null,
    { user: { id: "1", email: "a@b.c", name: "A", role: "OWNER", isActive: false } },
    { user: { id: "1", email: "a@b.c", name: "A", role: "CUSTOMER", isActive: true } },
  ])("rejects missing, inactive or non-admin sessions", async (session) => {
    mocks.getSession.mockResolvedValue(session);
    await expect(getCurrentAdmin()).resolves.toBeNull();
  });

  it("redirects when a protected server boundary has no valid session", async () => {
    mocks.getSession.mockResolvedValue(null);
    await expect(requireCurrentAdmin()).rejects.toThrow("REDIRECT:/admin/login");
    expect(mocks.redirect).toHaveBeenCalledWith("/admin/login");
  });
});
