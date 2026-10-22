import { describe, expect, it } from "vitest";

import { adminBootstrapSchema } from "@/lib/admin-bootstrap-schema";

describe("admin bootstrap input", () => {
  it("normalizes the email and supplies the non-public default name", () => {
    expect(
      adminBootstrapSchema.parse({
        email: " Owner@Example.COM ",
        password: "correct-horse-battery-staple",
      }),
    ).toEqual({
      email: "owner@example.com",
      password: "correct-horse-battery-staple",
      name: "Владелец YŌRI",
    });
  });

  it("rejects short passwords and malformed email addresses", () => {
    expect(
      adminBootstrapSchema.safeParse({ email: "not-an-email", password: "short" }).success,
    ).toBe(false);
  });
});
