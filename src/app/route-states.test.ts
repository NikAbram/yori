import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import ErrorPage from "./error";
import Loading from "./loading";
import CheckoutLoading from "./checkout/loading";
import OrdersLoading from "./orders/loading";
import ProfileLoading from "./profile/loading";

describe("route states", () => {
  it.each([
    ["раздел", Loading],
    ["корзина", CheckoutLoading],
    ["заказы", OrdersLoading],
    ["профиль", ProfileLoading],
  ])("announces the %s loading state", (_name, Component) => {
    const markup = renderToStaticMarkup(createElement(Component));

    expect(markup).toContain('role="status"');
    expect(markup).toContain('aria-live="polite"');
    expect(markup).toContain('aria-busy="true"');
  });

  it("exposes an alert and a retry action for route errors", () => {
    const markup = renderToStaticMarkup(createElement(ErrorPage, {
      error: new Error("test route error"),
      reset: () => undefined,
    }));

    expect(markup).toContain('role="alert"');
    expect(markup).toContain("Попробовать снова");
  });
});
