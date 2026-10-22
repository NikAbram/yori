import "dotenv/config";

import { join } from "node:path";
import { tmpdir } from "node:os";
import { expect, test } from "@playwright/test";
import { hashPassword } from "better-auth/crypto";

import { PrismaClient } from "../src/generated/prisma/client";
import { createPostgresAdapter } from "../src/lib/db/postgres-adapter";

const qaEmail = "qa-admin@yori.invalid";
const qaTelegramId = "999999999991";
const qaOrderIdempotencyKey = "qa-crm-stage-5-2";
const qaPassword = process.env.YORI_E2E_ADMIN_PASSWORD;
const databaseUrl = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
const runAddressOctet = (process.pid % 200) + 20;
const invalidLoginIp = `198.51.100.${runAddressOctet}`;
const validLoginIp = `203.0.113.${runAddressOctet}`;

function createQaClient() {
  if (!databaseUrl) throw new Error("A database URL is required for the admin e2e setup.");
  return new PrismaClient({ adapter: createPostgresAdapter(databaseUrl) });
}

test.beforeAll(async () => {
  if (!qaPassword || !databaseUrl) return;
  const prisma = createQaClient();
  const password = await hashPassword(qaPassword);

  try {
    await prisma.order.deleteMany({ where: { idempotencyKey: qaOrderIdempotencyKey } });
    await prisma.adminAuditLog.deleteMany({ where: { adminUser: { email: qaEmail } } });
    await prisma.adminUser.deleteMany({ where: { email: qaEmail } });
    await prisma.telegramUser.deleteMany({ where: { telegramId: qaTelegramId } });
    const user = await prisma.adminUser.create({
      data: {
        email: qaEmail,
        name: "QA администратор",
        emailVerified: true,
        role: "OWNER",
        isActive: true,
      },
      select: { id: true },
    });
    await prisma.adminAccount.create({
      data: {
        accountId: user.id,
        providerId: "credential",
        userId: user.id,
        password,
      },
    });
    const customer = await prisma.telegramUser.create({
      data: { telegramId: qaTelegramId, firstName: "QA клиент", allowPrivateTest: true },
      select: { id: true },
    });
    await prisma.order.create({
      data: {
        orderNo: "QA-5210",
        userId: customer.id,
        recipientName: "QA клиент",
        phone: "+7 900 000-00-00",
        city: "Тестовый город",
        street: "Тестовая",
        house: "1",
        subtotalKopeks: 64_900,
        deliveryKopeks: 19_900,
        totalKopeks: 84_800,
        paymentMethod: "CASH_ON_DELIVERY",
        status: "NEW",
        isTest: true,
        idempotencyKey: qaOrderIdempotencyKey,
        consentAcceptedAt: new Date(),
        items: {
          create: {
            productNameSnapshot: "Филадельфия классическая",
            unitPriceKopeks: 64_900,
            quantity: 1,
            lineTotalKopeks: 64_900,
          },
        },
        statusHistory: {
          create: { toStatus: "NEW", actorType: "SYSTEM" },
        },
      },
    });
  } finally {
    await prisma.$disconnect();
  }
});

test.afterAll(async () => {
  if (!qaPassword || !databaseUrl) return;
  const prisma = createQaClient();
  try {
    await prisma.order.deleteMany({ where: { idempotencyKey: qaOrderIdempotencyKey } });
    await prisma.telegramUser.deleteMany({ where: { telegramId: qaTelegramId } });
    await prisma.adminAuditLog.deleteMany({ where: { adminUser: { email: qaEmail } } });
    await prisma.adminUser.deleteMany({ where: { email: qaEmail } });
  } finally {
    await prisma.$disconnect();
  }
});

test("redirects anonymous administrators and renders a usable login", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const messages: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error" || message.type() === "warning") messages.push(message.text());
  });

  await page.goto("/admin");

  await expect(page).toHaveURL(/\/admin\/login$/);
  await expect(page).toHaveTitle("Вход — YŌRI CRM");
  await expect(page.getByRole("heading", { name: "Вход в CRM" })).toBeVisible();
  await expect(page.getByLabel("Электронная почта")).toBeVisible();
  await expect(page.getByLabel("Пароль")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: join(tmpdir(), "yori-admin-login-mobile.png") });
  expect(messages).toEqual([]);
});

test("keeps public email registration disabled", async ({ request }) => {
  const response = await request.post("/api/admin/auth/sign-up/email", {
    data: {
      name: "Посторонний",
      email: "outsider@yori.invalid",
      password: "outsider-password-123",
    },
  });

  expect(response.ok()).toBe(false);
  expect([400, 403]).toContain(response.status());
});

test("uses one generic error for invalid credentials", async ({ page }) => {
  await page.setExtraHTTPHeaders({ "x-forwarded-for": invalidLoginIp });
  await page.goto("/admin/login");
  await page.getByLabel("Электронная почта").fill("unknown@yori.invalid");
  await page.getByLabel("Пароль").fill("wrong-password-123");
  await page.getByRole("button", { name: "Войти" }).click();

  await expect(page.getByRole("status")).toHaveText(
    "Не удалось войти. Проверьте данные и повторите попытку.",
  );
});

test("creates a protected session and signs out", async ({ page }) => {
  test.skip(!qaPassword || !databaseUrl, "Temporary QA administrator credentials are not configured.");

  await page.setExtraHTTPHeaders({ "x-forwarded-for": validLoginIp });
  await page.setViewportSize({ width: 1440, height: 900 });
  const messages: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error" || message.type() === "warning") messages.push(message.text());
  });
  await page.goto("/admin/login");
  await page.getByLabel("Электронная почта").fill(qaEmail);
  await page.getByLabel("Пароль").fill(qaPassword!);
  await page.getByRole("button", { name: "Войти" }).click();

  await expect(page).toHaveURL(/\/admin$/);
  await expect(page.getByRole("heading", { name: "Сегодня видно главное" })).toBeVisible();
  await expect(page.getByText("Реальная выручка")).toBeVisible();
  await expect(page.getByText("QA-5210")).toBeVisible();
  await expect(page.getByText("Тестовый", { exact: true })).toBeVisible();
  await page.screenshot({ path: join(tmpdir(), "yori-admin-home-desktop.png") });
  const sessionCookie = (await page.context().cookies()).find((cookie) =>
    cookie.name.includes("yori-admin.session_token"),
  );
  expect(sessionCookie).toMatchObject({ httpOnly: true, sameSite: "Lax", secure: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  expect(messages).toEqual([]);

  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("link", { name: "Заказы" }).click();
  await expect(page).toHaveURL(/\/admin\/orders$/);
  await expect(page.getByRole("heading", { name: "Все заказы" })).toBeVisible();
  await page.getByRole("link", { name: "Открыть заказ QA-5210" }).click();
  await expect(page).toHaveURL(/\/admin\/orders\/[0-9a-f-]+$/);
  await expect(page.getByRole("heading", { name: "QA-5210" })).toBeVisible();
  await expect(page.getByText("Контакты и доставка")).toBeVisible();
  await expect(page.getByLabel("Следующий статус")).toHaveValue("CONFIRMED");
  await page.getByLabel("Новая внутренняя заметка").fill("QA: упаковку проверить дважды");
  await page.getByRole("button", { name: "Добавить заметку" }).click();
  await expect(page.getByRole("status")).toHaveText("Заметка добавлена.");
  await expect(page.getByText("QA: упаковку проверить дважды")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: join(tmpdir(), "yori-admin-order-mobile.png"), fullPage: true });

  await page.getByRole("link", { name: "Все заказы" }).click();
  await page.getByLabel("Номер или телефон").fill("order-that-does-not-exist");
  await page.getByRole("button", { name: "Применить" }).click();
  await expect(page).toHaveURL(/q=order-that-does-not-exist/);
  await expect(page.getByRole("heading", { name: "Заказов не найдено" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: join(tmpdir(), "yori-admin-orders-mobile.png") });
  expect(messages).toEqual([]);

  await page.getByRole("button", { name: "Выйти" }).click();
  await expect(page).toHaveURL(/\/admin\/login$/);
});
