import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { tmpdir } from "node:os";
import { join } from "node:path";

const targetViewports = [320, 375, 390, 430, 768, 1024, 1440];
const publicRoutes = ["/", "/catalog", "/product/shrimp-tempura", "/cart", "/checkout", "/orders", "/orders/preview", "/profile", "/help", "/delivery", "/privacy"];

function watchRuntimeErrors(page: Page) {
  const errors: string[] = [];
  page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
  page.on("pageerror", (error) => errors.push(error.message));
  return errors;
}

async function seedCart(page: Page) {
  await page.evaluate(() => localStorage.setItem("yori-cart-v1", JSON.stringify({
    version: 2,
    lines: [{ productId: "p14", quantity: 2, priceKopeksSnapshot: 59900 }],
  })));
}

test("основные маршруты проходят автоматическую WCAG-проверку", async ({ page }) => {
  const runtimeErrors = watchRuntimeErrors(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await seedCart(page);

  for (const route of publicRoutes) {
    await page.goto(route);
    await expect(page.locator("main")).not.toBeEmpty();
    await expect(page.getByText(/Unhandled Runtime Error|Application error/)).toHaveCount(0);
    const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
    expect(results.violations, `${route}: ${results.violations.map((item) => `${item.id} (${item.nodes.length})`).join(", ")}`).toEqual([]);
  }
  expect(runtimeErrors).toEqual([]);
});

test("клавиатура видит skip-link, фильтры и checkout", async ({ page }) => {
  const runtimeErrors = watchRuntimeErrors(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/catalog");
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "К основному содержанию" })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("main")).toBeFocused();

  await page.getByRole("button", { name: "Темпура", exact: true }).focus();
  expect(await page.getByRole("button", { name: "Темпура", exact: true }).evaluate((element) => getComputedStyle(element).outlineStyle)).not.toBe("none");
  await page.keyboard.press("Enter");
  await expect(page.getByRole("button", { name: "Темпура", exact: true })).toHaveAttribute("aria-pressed", "true");

  await seedCart(page);
  await page.goto("/checkout");
  await page.getByLabel("Имя").focus();
  await page.keyboard.type("Никита");
  await page.keyboard.press("Tab");
  await expect(page.getByLabel("Телефон")).toBeFocused();
  expect(runtimeErrors).toEqual([]);
});

test("все целевые viewport свободны от скролла, перекрытий и битых изображений", async ({ page }) => {
  const runtimeErrors = watchRuntimeErrors(page);
  await page.goto("/");
  await seedCart(page);

  for (const width of targetViewports) {
    await page.setViewportSize({ width, height: width <= 430 ? 844 : 900 });
    for (const route of publicRoutes) {
      await page.goto(route);
      const layout = await page.evaluate(() => ({
        clientWidth: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth,
        brokenImages: [...document.images].filter((image) => image.complete && image.naturalWidth === 0).length,
      }));
      expect(layout.scrollWidth, `${route} at ${width}px`).toBeLessThanOrEqual(layout.clientWidth);
      expect(layout.brokenImages, `${route} at ${width}px`).toBe(0);
    }
  }

  await page.setViewportSize({ width: 390, height: 844 });
  for (const route of publicRoutes) {
    await page.goto(route);
    const controls = page.locator("main a:visible, main button:visible, main input:visible, main select:visible, main textarea:visible");
    const controlCount = await controls.count();
    if (controlCount === 0) continue;
    const lastControl = controls.nth(controlCount - 1);
    await lastControl.evaluate((element) => {
      document.documentElement.style.scrollBehavior = "auto";
      element.scrollIntoView({ block: "end" });
    });
    await page.evaluate(() => window.scrollBy(0, 104));
    const [controlBox, navBox] = await Promise.all([lastControl.boundingBox(), page.locator(".bottom-nav").boundingBox()]);
    expect(controlBox, `${route}: last control`).not.toBeNull();
    expect(navBox, `${route}: bottom navigation`).not.toBeNull();
    expect(controlBox!.y + controlBox!.height, route).toBeLessThanOrEqual(navBox!.y);
  }
  await page.goto("/checkout");
  await page.screenshot({ path: join(tmpdir(), "yori-stage-2-mobile.png"), fullPage: false });

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  await page.screenshot({ path: join(tmpdir(), "yori-stage-2-desktop.png"), fullPage: false });
  expect(runtimeErrors).toEqual([]);
});

test("empty, unavailable и not-found состояния дают следующий шаг", async ({ page }) => {
  const runtimeErrors = watchRuntimeErrors(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/cart");
  await expect(page.getByRole("heading", { name: "Корзина пока пустая" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Открыть меню" })).toBeVisible();

  await page.goto("/checkout");
  await expect(page.getByRole("heading", { name: "Сначала соберите корзину" })).toBeVisible();
  await page.goto("/product/not-a-real-product");
  await expect(page.getByRole("heading", { name: "Такого блюда нет" })).toBeVisible();

  await page.goto("/catalog");
  await page.getByLabel("Поиск по меню").fill("Ролл с чукой");
  await expect(page.getByRole("button", { name: "Добавить Ролл с чукой в корзину" })).toBeDisabled();
  expect(runtimeErrors).toEqual([]);
});

test("тёмная тема и reduced motion сохраняют читаемый интерфейс", async ({ page }) => {
  const runtimeErrors = watchRuntimeErrors(page);
  await page.emulateMedia({ colorScheme: "dark", reducedMotion: "reduce" });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await seedCart(page);

  for (const route of ["/", "/catalog", "/product/shrimp-tempura", "/cart", "/checkout", "/orders", "/profile"]) {
    await page.goto(route);
    const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
    expect(results.violations, `${route} dark: ${results.violations.map((item) => `${item.id} (${item.nodes.length})`).join(", ")}`).toEqual([]);
  }
  await page.screenshot({ path: join(tmpdir(), "yori-stage-2-dark.png"), fullPage: false });
  expect(runtimeErrors).toEqual([]);
});
