import { expect, test } from "@playwright/test";
import { tmpdir } from "node:os";
import { join } from "node:path";

function watchRuntimeErrors(page: import("@playwright/test").Page) {
  const errors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error" || message.type() === "warning") errors.push(message.text());
  });
  page.on("pageerror", (error) => errors.push(error.message));
  return errors;
}

test("главный путь: поиск, каталог, товар, корзина и количество", async ({ page }) => {
  const runtimeErrors = watchRuntimeErrors(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(page).toHaveTitle(/YŌRI/);
  await expect(page.getByRole("heading", { name: "Вкус, который держит форму" })).toBeVisible();
  await expect(page.getByText(/Unhandled Runtime Error|Application error/)).toHaveCount(0);
  await page.screenshot({ path: join(tmpdir(), "yori-home-mobile.png"), fullPage: false });
  await page.getByLabel("Поиск по названию").fill("темпура");
  await expect(page.getByText("Темпура с креветкой", { exact: true }).first()).toBeVisible();
  await page.getByRole("link", { name: "Каталог" }).click();
  await page.getByRole("button", { name: "Темпура", exact: true }).click();
  await expect(page.locator('[data-testid="product-card"]:visible')).toHaveCount(2);
  await page.locator('.product-image-link[href="/product/shrimp-tempura"]:visible').first().click();
  await page.getByRole("button", { name: "Увеличить количество" }).click();
  await page.getByRole("button", { name: /Добавить/ }).click();
  await expect(page.getByText("Темпура с креветкой добавлен в корзину")).toBeVisible();
  await page.screenshot({ path: join(tmpdir(), "yori-product-mobile.png"), fullPage: false });
  await page.getByRole("link", { name: /Корзина/ }).click();
  await expect(page.getByRole("heading", { name: "Корзина" })).toBeVisible();
  await expect(page.getByRole("complementary", { name: "Сумма заказа" }).getByText("1 198 ₽")).toBeVisible();
  await page.screenshot({ path: join(tmpdir(), "yori-cart-mobile.png"), fullPage: false });
  await page.reload();
  await expect(page.getByRole("complementary", { name: "Сумма заказа" }).getByText("1 198 ₽")).toBeVisible();

  await page.getByRole("button", { name: "Уменьшить количество Темпура с креветкой" }).click();
  await expect(page.getByRole("complementary", { name: "Сумма заказа" }).getByText("599 ₽")).toBeVisible();
  await page.reload();
  await expect(page.getByRole("complementary", { name: "Сумма заказа" }).getByText("599 ₽")).toBeVisible();
  await page.getByRole("button", { name: "Удалить" }).click();
  await expect(page.getByRole("heading", { name: "Корзина пока пуста" })).toBeVisible();

  await page.goto("/catalog");
  await page.getByRole("button", { name: "Добавить Темпура с креветкой в корзину" }).click();
  await page.getByRole("link", { name: /Корзина/ }).click();
  await page.getByRole("button", { name: "Очистить" }).click();
  await expect(page.getByRole("heading", { name: "Корзина пока пуста" })).toBeVisible();
  expect(runtimeErrors).toEqual([]);
});

test("каталог не создаёт горизонтальный скролл на целевых ширинах", async ({ page }) => {
  const runtimeErrors = watchRuntimeErrors(page);
  for (const width of [320, 375, 390, 430, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: width < 600 ? 800 : 900 });
    await page.goto("/catalog");
    const dimensions = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth }));
    expect(dimensions.scrollWidth, `width ${width}`).toBeLessThanOrEqual(dimensions.clientWidth);
    const cards = page.locator('[data-testid="product-card"]:visible');
    for (let index = 0; index < await cards.count(); index += 1) {
      const overlapsProductSize = await cards.nth(index).evaluate((card) => {
        const button = card.querySelector(".quick-add")?.getBoundingClientRect();
        const size = card.querySelector(".product-size")?.getBoundingClientRect();
        if (!button || !size) return false;
        return button.left < size.right && button.right > size.left && button.top < size.bottom && button.bottom > size.top;
      });
      expect(overlapsProductSize, `card ${index + 1} at ${width}px`).toBe(false);
    }
    const geometry = await cards.evaluateAll((items) => items.map((card) => {
      const cardBox = card.getBoundingClientRect();
      const buttonBox = card.querySelector(".quick-add")?.getBoundingClientRect();
      return { top: cardBox.top, height: cardBox.height, buttonTop: buttonBox?.top ?? 0 };
    }));
    const firstRow = geometry.filter((item) => Math.abs(item.top - geometry[0].top) < 1);
    if (firstRow.length > 1) {
      const heights = firstRow.map((item) => item.height);
      const buttonTops = firstRow.map((item) => item.buttonTop);
      expect(Math.max(...heights) - Math.min(...heights), `card heights at ${width}px`).toBeLessThanOrEqual(1);
      expect(Math.max(...buttonTops) - Math.min(...buttonTops), `button alignment at ${width}px`).toBeLessThanOrEqual(1);
    }
    if (width === 1440) await page.screenshot({ path: join(tmpdir(), "yori-catalog-desktop.png"), fullPage: false });
  }
  await page.emulateMedia({ colorScheme: "dark", reducedMotion: "reduce" });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/catalog");
  await page.screenshot({ path: join(tmpdir(), "yori-catalog-dark.png"), fullPage: false });
  expect(runtimeErrors).toEqual([]);
});

test("пустой поиск предлагает восстановление", async ({ page }) => {
  const runtimeErrors = watchRuntimeErrors(page);
  await page.goto("/catalog");
  await page.getByLabel("Поиск по меню").fill("несуществующее блюдо");
  await expect(page.getByRole("heading", { name: "Нет подходящих блюд" })).toBeVisible();
  await page.getByRole("button", { name: "Сбросить фильтры" }).click();
  await expect(page.getByTestId("product-card")).toHaveCount(25);
  expect(runtimeErrors).toEqual([]);
});

const privateOrderPath = "/orders/9ab96f80-58b8-4c49-8c93-1a6d282d3016";

test("личные разделы скрывают заказы без Telegram-сессии", async ({ page }) => {
  const runtimeErrors = watchRuntimeErrors(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/orders");
  await expect(page).toHaveTitle(/Заказы/);
  await expect(page.getByRole("heading", { name: "Личные данные скрыты" })).toBeVisible();
  await expect(page.locator(".order-preview")).toHaveCount(0);
  await page.goto(privateOrderPath);
  await expect(page.getByRole("heading", { name: "Откройте заказ в Telegram" })).toBeVisible();
  await page.screenshot({ path: join(tmpdir(), "yori-order-private-mobile.png"), fullPage: false });

  await page.getByRole("link", { name: "Профиль" }).click();
  await expect(page.getByRole("heading", { name: "Откройте YŌRI в Telegram" })).toBeVisible();
  await page.screenshot({ path: join(tmpdir(), "yori-profile-mobile.png"), fullPage: false });
  await page.getByRole("link", { name: /Доставка/ }).click();
  await expect(page.getByRole("heading", { name: "Доставка без догадок" })).toBeVisible();
  expect(runtimeErrors).toEqual([]);
});

test("новые маршруты не создают горизонтальный скролл", async ({ page }) => {
  const runtimeErrors = watchRuntimeErrors(page);
  for (const route of ["/orders", privateOrderPath, "/profile", "/help", "/delivery", "/privacy"]) {
    for (const width of [320, 1440]) {
      await page.setViewportSize({ width, height: width === 320 ? 800 : 900 });
      await page.goto(route);
      const dimensions = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth }));
      expect(dimensions.scrollWidth, `${route} at ${width}px`).toBeLessThanOrEqual(dimensions.clientWidth);
      if (route === privateOrderPath && width === 1440) await page.screenshot({ path: join(tmpdir(), "yori-order-private-desktop.png"), fullPage: false });
    }
  }
  expect(runtimeErrors).toEqual([]);
});

test("checkout вне разрешённой Telegram-сессии остаётся закрытым", async ({ page }) => {
  const runtimeErrors = watchRuntimeErrors(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/catalog");
  await page.getByRole("button", { name: "Добавить Темпура с креветкой в корзину" }).click();
  await page.getByRole("button", { name: "Добавить Темпура с креветкой в корзину" }).click();
  await page.getByRole("link", { name: /Корзина/ }).click();
  await page.getByRole("link", { name: "Перейти к оформлению" }).click();

  await expect(page).toHaveURL(/\/checkout$/);
  await expect(page.getByRole("heading", { name: "Куда привезти заказ" })).toBeVisible();
  await expect(page.getByText("Приём заказов сейчас закрыт", { exact: true }).first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Оформить заказ" })).toBeDisabled();
  await expect(page.getByRole("radiogroup", { name: "Способ оплаты" }).getByRole("radio")).toHaveCount(0);
  await page.screenshot({ path: join(tmpdir(), "yori-checkout-mobile.png"), fullPage: true });
  expect(runtimeErrors).toEqual([]);
});

test("checkout не создаёт горизонтальный скролл на целевых ширинах", async ({ page }) => {
  const runtimeErrors = watchRuntimeErrors(page);
  await page.goto("/catalog");
  await page.getByRole("button", { name: "Добавить Темпура с креветкой в корзину" }).click();

  for (const width of [320, 390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: width < 600 ? 800 : 900 });
    await page.goto("/checkout");
    await expect(page.getByRole("heading", { name: "Куда привезти заказ" })).toBeVisible();
    const dimensions = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth }));
    expect(dimensions.scrollWidth, `checkout at ${width}px`).toBeLessThanOrEqual(dimensions.clientWidth);
    if (width === 1440) await page.screenshot({ path: join(tmpdir(), "yori-checkout-desktop.png"), fullPage: true });
  }
  expect(runtimeErrors).toEqual([]);
});

test("browser fallback убирает нижнюю навигацию при экранной клавиатуре", async ({ page }) => {
  const runtimeErrors = watchRuntimeErrors(page);
  await page.addInitScript(() => {
    let visibleHeight = 844;
    const viewport = new EventTarget();
    Object.defineProperty(viewport, "height", { get: () => visibleHeight });
    Object.defineProperty(window, "innerHeight", { configurable: true, value: 844 });
    Object.defineProperty(window, "visualViewport", { configurable: true, value: viewport });
    (window as typeof window & { __setVisibleHeight: (height: number) => void }).__setVisibleHeight = (height) => {
      visibleHeight = height;
      viewport.dispatchEvent(new Event("resize"));
    };
  });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/checkout");
  await expect(page.locator("html")).not.toHaveAttribute("data-telegram", "true");

  await page.evaluate(() => {
    (window as typeof window & { __setVisibleHeight: (height: number) => void }).__setVisibleHeight(600);
  });
  await expect(page.locator("html")).toHaveAttribute("data-keyboard-open", "");
  await expect(page.locator(".bottom-nav")).toHaveCSS("pointer-events", "none");

  await page.evaluate(() => {
    (window as typeof window & { __setVisibleHeight: (height: number) => void }).__setVisibleHeight(844);
  });
  await expect(page.locator("html")).not.toHaveAttribute("data-keyboard-open", "");
  expect(runtimeErrors).toEqual([]);
});

test("Telegram bridge применяет тему, safe area, Back Button и haptics", async ({ page }) => {
  const runtimeErrors = watchRuntimeErrors(page);
  await page.addInitScript(() => {
    const telegramWindow = window as typeof window & {
      __telegramEvents: Array<{ name: string; params?: unknown }>;
      Telegram?: { WebView?: { receiveEvent?: (name: string, params?: unknown) => void } };
      TelegramWebviewProxy: { postEvent: (name: string, params?: string) => void };
    };
    telegramWindow.__telegramEvents = [];
    telegramWindow.TelegramWebviewProxy = {
      postEvent(name, params) {
        telegramWindow.__telegramEvents.push({ name, params: params ? JSON.parse(params) : undefined });
        window.setTimeout(() => {
          const receive = telegramWindow.Telegram?.WebView?.receiveEvent;
          if (name === "web_app_request_viewport") receive?.("viewport_changed", { height: 844, width: 390, is_expanded: true, is_state_stable: true });
          if (name === "web_app_request_safe_area") receive?.("safe_area_changed", { top: 12, right: 0, bottom: 24, left: 0 });
          if (name === "web_app_request_content_safe_area") receive?.("content_safe_area_changed", { top: 8, right: 0, bottom: 4, left: 0 });
        });
      },
    };
  });

  const themeParams = encodeURIComponent(JSON.stringify({
    bg_color: "#101820",
    secondary_bg_color: "#17232d",
    text_color: "#f6f2e9",
    hint_color: "#aab4bb",
    button_color: "#d64a32",
    button_text_color: "#ffffff",
    section_separator_color: "#3a4650",
  }));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`/?tgWebAppVersion=8.0&tgWebAppPlatform=android&tgWebAppThemeParams=${themeParams}`);

  await expect(page.locator("html")).toHaveAttribute("data-telegram", "true");
  await expect(page.locator("html")).toHaveAttribute("data-tg-color-scheme", "dark");
  await expect.poll(() => page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--tg-viewport-safe-area-inset-top").trim())).toBe("12px");
  expect(await page.evaluate(() => getComputedStyle(document.body).backgroundColor)).toBe("rgb(16, 24, 32)");

  await page.getByRole("link", { name: /Открыть меню/ }).click();
  await page.getByRole("button", { name: "Темпура", exact: true }).click();
  await page.locator('.product-image-link[href="/product/shrimp-tempura"]:visible').first().click();
  await expect.poll(() => page.evaluate(() => (window as typeof window & { __telegramEvents: Array<{ name: string; params?: { is_visible?: boolean } }> }).__telegramEvents.some((event) => event.name === "web_app_setup_back_button" && event.params?.is_visible === true))).toBe(true);
  expect(await page.locator(".bottom-nav").evaluate((element) => getComputedStyle(element).bottom)).toBe("30px");
  await page.screenshot({ path: join(tmpdir(), "yori-telegram-dark-product.png"), fullPage: false });

  await page.getByRole("button", { name: /Добавить/ }).click();
  await expect.poll(() => page.evaluate(() => (window as typeof window & { __telegramEvents: Array<{ name: string }> }).__telegramEvents.some((event) => event.name === "web_app_trigger_haptic_feedback"))).toBe(true);

  await page.evaluate(() => (window as typeof window & { Telegram?: { WebView?: { receiveEvent?: (name: string, params?: unknown) => void } } }).Telegram?.WebView?.receiveEvent?.("viewport_changed", { height: 600, width: 390, is_expanded: true, is_state_stable: false }));
  await expect(page.locator("html")).toHaveAttribute("data-keyboard-open", "");
  await expect(page.locator(".bottom-nav")).toHaveCSS("pointer-events", "none");
  await page.evaluate(() => (window as typeof window & { Telegram?: { WebView?: { receiveEvent?: (name: string, params?: unknown) => void } } }).Telegram?.WebView?.receiveEvent?.("viewport_changed", { height: 844, width: 390, is_expanded: true, is_state_stable: true }));
  await expect(page.locator("html")).not.toHaveAttribute("data-keyboard-open", "");

  await page.evaluate(() => (window as typeof window & { Telegram?: { WebView?: { receiveEvent?: (name: string) => void } } }).Telegram?.WebView?.receiveEvent?.("back_button_pressed"));
  await expect(page).toHaveURL(/\/catalog/);
  expect(runtimeErrors).toEqual([]);
});
