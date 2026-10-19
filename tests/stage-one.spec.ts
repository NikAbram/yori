import { expect, test } from "@playwright/test";
import { tmpdir } from "node:os";
import { join } from "node:path";

function watchRuntimeErrors(page: import("@playwright/test").Page) {
  const errors: string[] = [];
  page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
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
  await page.getByRole("link", { name: "Открыть Темпура с креветкой" }).click();
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
  expect(runtimeErrors).toEqual([]);
});

test("каталог не создаёт горизонтальный скролл на целевых ширинах", async ({ page }) => {
  const runtimeErrors = watchRuntimeErrors(page);
  for (const width of [320, 375, 390, 430, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: width < 600 ? 800 : 900 });
    await page.goto("/catalog");
    const dimensions = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth }));
    expect(dimensions.scrollWidth, `width ${width}`).toBeLessThanOrEqual(dimensions.clientWidth);
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

test("личные разделы объясняют доступ и показывают безопасный пример статуса", async ({ page }) => {
  const runtimeErrors = watchRuntimeErrors(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/orders");
  await expect(page).toHaveTitle(/Заказы/);
  await expect(page.getByRole("heading", { name: "Личные данные скрыты" })).toBeVisible();
  await page.getByRole("link", { name: /YŌRI · пример/ }).click();
  await expect(page).toHaveURL(/\/orders\/preview$/);
  await expect(page.getByRole("heading", { name: "Статус" })).toBeVisible();
  await expect(page.getByText("Готовится", { exact: true }).first()).toBeVisible();
  await page.screenshot({ path: join(tmpdir(), "yori-order-preview-mobile.png"), fullPage: false });

  await page.getByRole("link", { name: "Профиль" }).click();
  await expect(page.getByRole("heading", { name: "Откройте YŌRI в Telegram" })).toBeVisible();
  await page.screenshot({ path: join(tmpdir(), "yori-profile-mobile.png"), fullPage: false });
  await page.getByRole("link", { name: /Доставка/ }).click();
  await expect(page.getByRole("heading", { name: "Доставка без догадок" })).toBeVisible();
  expect(runtimeErrors).toEqual([]);
});

test("новые маршруты не создают горизонтальный скролл", async ({ page }) => {
  const runtimeErrors = watchRuntimeErrors(page);
  for (const route of ["/orders", "/orders/preview", "/profile", "/help", "/delivery", "/privacy"]) {
    for (const width of [320, 1440]) {
      await page.setViewportSize({ width, height: width === 320 ? 800 : 900 });
      await page.goto(route);
      const dimensions = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth }));
      expect(dimensions.scrollWidth, `${route} at ${width}px`).toBeLessThanOrEqual(dimensions.clientWidth);
      if (route === "/orders/preview" && width === 1440) await page.screenshot({ path: join(tmpdir(), "yori-order-preview-desktop.png"), fullPage: false });
    }
  }
  expect(runtimeErrors).toEqual([]);
});

test("checkout проверяет данные локально и честно не создаёт заказ", async ({ page }) => {
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
  await page.getByRole("button", { name: "Проверить данные" }).click();
  await expect(page.getByText("Укажите имя получателя")).toBeVisible();
  await expect(page.getByText("Введите российский номер из 10 цифр")).toBeVisible();

  await page.getByLabel("Имя").fill("Никита");
  await page.getByLabel("Телефон").fill("8 927 123-45-67");
  await page.getByLabel("Город").fill("Самара");
  await page.getByLabel("Улица").fill("Ленинградская");
  await page.getByLabel("Дом").fill("10");
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Проверить данные" }).click();

  await expect(page.getByText("Данные заполнены", { exact: true })).toBeVisible();
  await expect(page.getByText(/Заказ не создан/)).toBeVisible();
  await page.screenshot({ path: join(tmpdir(), "yori-checkout-mobile.png"), fullPage: true });
  expect(runtimeErrors).toEqual([]);
});

test("checkout не создаёт горизонтальный скролл на целевых ширинах", async ({ page }) => {
  const runtimeErrors = watchRuntimeErrors(page);
  await page.goto("/checkout");
  await page.evaluate(() => localStorage.setItem("yori-cart-v1", JSON.stringify({
    version: 2,
    lines: [{ productId: "p14", quantity: 2, priceKopeksSnapshot: 59900 }],
  })));

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
