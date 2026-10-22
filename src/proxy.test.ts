import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";

import { proxy } from "@/proxy";

describe("administrative proxy", () => {
  it("allows the login page without a session cookie", () => {
    const response = proxy(new NextRequest("https://yori.test/admin/login"));
    expect(response.headers.get("x-middleware-next")).toBe("1");
  });

  it("redirects an optimistic unauthenticated request to the fixed login path", () => {
    const response = proxy(new NextRequest("https://yori.test/admin"));
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("https://yori.test/admin/login");
  });

  it("allows a request with an admin session cookie for the server layout to verify", () => {
    const request = new NextRequest("https://yori.test/admin", {
      headers: { cookie: "yori-admin.session_token=opaque-token" },
    });
    const response = proxy(request);
    expect(response.headers.get("x-middleware-next")).toBe("1");
  });
});
