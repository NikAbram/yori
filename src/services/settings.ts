import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import { cacheLife, cacheTag, updateTag } from "next/cache";

import type { AdminSettingsData } from "@/lib/admin-settings-schema";
import { prisma } from "@/lib/db/prisma";
import { getOptionalTelegramManagerChatId } from "@/lib/telegram/bot-config";
import { requireCurrentAdmin } from "@/services/admin-auth";

export const SETTINGS_CACHE_TAG = "site-settings";

const siteSettingsSelect = {
  id: true,
  brandName: true,
  brandDescription: true,
  isOrderingEnabled: true,
  deliveryKopeks: true,
  freeDeliveryFromKopeks: true,
  minimumOrderKopeks: true,
  cashOnDeliveryEnabled: true,
  cardOnDeliveryEnabled: true,
  contactText: true,
  deliveryTerms: true,
  privacyText: true,
  operatorName: true,
  managerTelegramChatId: true,
  commercialHostingConfirmed: true,
  liveReadyAt: true,
  updatedAt: true,
  updatedByAdmin: { select: { name: true } },
} satisfies Prisma.SiteSettingsSelect;

const publicSettingsSelect = {
  brandName: true,
  brandDescription: true,
  isOrderingEnabled: true,
  deliveryKopeks: true,
  freeDeliveryFromKopeks: true,
  minimumOrderKopeks: true,
  cashOnDeliveryEnabled: true,
  cardOnDeliveryEnabled: true,
  contactText: true,
  deliveryTerms: true,
  privacyText: true,
  operatorName: true,
  managerTelegramChatId: true,
  commercialHostingConfirmed: true,
  liveReadyAt: true,
} satisfies Prisma.SiteSettingsSelect;

type SiteSettingsRow = Prisma.SiteSettingsGetPayload<{ select: typeof siteSettingsSelect }>;

const DEFAULT_SETTINGS: Omit<SiteSettingsRow, "updatedAt"> & { updatedAt: null } = {
  id: "default",
  brandName: "YŌRI",
  brandDescription: null,
  isOrderingEnabled: false,
  deliveryKopeks: 19_900,
  freeDeliveryFromKopeks: 180_000,
  minimumOrderKopeks: 70_000,
  cashOnDeliveryEnabled: false,
  cardOnDeliveryEnabled: false,
  contactText: null,
  deliveryTerms: null,
  privacyText: null,
  operatorName: null,
  managerTelegramChatId: null,
  commercialHostingConfirmed: false,
  liveReadyAt: null,
  updatedAt: null,
  updatedByAdmin: null,
};

const changedFieldLabels: Record<keyof Omit<AdminSettingsData, "liveReadinessConfirmed">, string> = {
  brandName: "название бренда",
  brandDescription: "описание бренда",
  isOrderingEnabled: "приём заказов",
  deliveryKopeks: "стоимость доставки",
  freeDeliveryFromKopeks: "порог бесплатной доставки",
  minimumOrderKopeks: "минимальная сумма",
  cashOnDeliveryEnabled: "оплата наличными",
  cardOnDeliveryEnabled: "оплата картой",
  contactText: "контакты",
  deliveryTerms: "условия доставки",
  privacyText: "текст о данных",
  operatorName: "оператор",
  managerTelegramChatId: "чат менеджера",
  commercialHostingConfirmed: "коммерческий хостинг",
};

export type ReadinessCheck = {
  key: string;
  label: string;
  complete: boolean;
  detail: string;
};

export class AdminSettingsError extends Error {
  constructor(
    public readonly code: "SETTINGS_CHANGED" | "LIVE_READINESS_INCOMPLETE",
    public readonly missing: string[] = [],
  ) {
    super(code);
    this.name = "AdminSettingsError";
  }
}

function hasText(value: string | null) {
  return Boolean(value?.trim());
}

function effectiveManagerChatId(settings: { managerTelegramChatId: string | null }) {
  return settings.managerTelegramChatId ?? getOptionalTelegramManagerChatId();
}

export function getLiveReadinessChecks(settings: {
  isOrderingEnabled: boolean;
  cashOnDeliveryEnabled: boolean;
  cardOnDeliveryEnabled: boolean;
  deliveryTerms: string | null;
  contactText: string | null;
  privacyText: string | null;
  operatorName: string | null;
  managerTelegramChatId: string | null;
  commercialHostingConfirmed: boolean;
}): ReadinessCheck[] {
  const infrastructureManagerChat = !settings.managerTelegramChatId && Boolean(getOptionalTelegramManagerChatId());
  return [
    { key: "ordering", label: "Приём заказов", complete: settings.isOrderingEnabled, detail: settings.isOrderingEnabled ? "Разрешён в настройках" : "Отключён" },
    { key: "payment", label: "Способ оплаты", complete: settings.cashOnDeliveryEnabled || settings.cardOnDeliveryEnabled, detail: settings.cashOnDeliveryEnabled || settings.cardOnDeliveryEnabled ? "Есть доступный способ" : "Не выбран" },
    { key: "operator", label: "Действующий оператор", complete: hasText(settings.operatorName), detail: hasText(settings.operatorName) ? "Указан" : "Не указан" },
    { key: "delivery", label: "Зоны и условия доставки", complete: hasText(settings.deliveryTerms), detail: hasText(settings.deliveryTerms) ? "Опубликованы" : "Не заполнены" },
    { key: "contacts", label: "Достоверные контакты", complete: hasText(settings.contactText), detail: hasText(settings.contactText) ? "Опубликованы" : "Не заполнены" },
    { key: "privacy", label: "Правовые сведения", complete: hasText(settings.privacyText), detail: hasText(settings.privacyText) ? "Опубликованы" : "Не заполнены" },
    { key: "manager-chat", label: "Чат менеджера", complete: Boolean(effectiveManagerChatId(settings)), detail: settings.managerTelegramChatId ? "Задан в CRM" : infrastructureManagerChat ? "Задан в окружении" : "Не настроен" },
    { key: "hosting", label: "Коммерческий хостинг", complete: settings.commercialHostingConfirmed, detail: settings.commercialHostingConfirmed ? "Подтверждён владельцем" : "Не подтверждён" },
  ];
}

function modeLabel() {
  if (process.env.ORDER_MODE === "private_test") return { value: "private_test" as const, label: "Закрытое тестирование" };
  if (process.env.ORDER_MODE === "live") return { value: "live" as const, label: "Реальный приём заказов" };
  return { value: "invalid" as const, label: "Режим не настроен" };
}

async function getCachedSettingsRow() {
  "use cache";
  cacheLife("hours");
  cacheTag(SETTINGS_CACHE_TAG);
  return prisma.siteSettings.findUnique({ where: { id: "default" }, select: publicSettingsSelect });
}

export async function getPublicSiteSettings() {
  const row = await getCachedSettingsRow();
  const settings = row ?? DEFAULT_SETTINGS;
  const readiness = getLiveReadinessChecks(settings);
  const mode = modeLabel();
  const liveReady = readiness.every((item) => item.complete) && settings.liveReadyAt !== null;

  return {
    brandName: settings.brandName,
    brandDescription: settings.brandDescription,
    deliveryKopeks: settings.deliveryKopeks,
    freeDeliveryFromKopeks: settings.freeDeliveryFromKopeks,
    minimumOrderKopeks: settings.minimumOrderKopeks,
    cashOnDeliveryEnabled: settings.cashOnDeliveryEnabled,
    cardOnDeliveryEnabled: settings.cardOnDeliveryEnabled,
    contactText: settings.contactText,
    deliveryTerms: settings.deliveryTerms,
    privacyText: settings.privacyText,
    isPublicOrderingOpen: mode.value === "live" && liveReady,
  };
}

export async function getAdminSettingsEditor() {
  const admin = await requireCurrentAdmin();
  const row = await prisma.siteSettings.findUnique({ where: { id: "default" }, select: siteSettingsSelect });
  const settings = row ?? DEFAULT_SETTINGS;
  return {
    settings,
    orderMode: modeLabel(),
    readiness: getLiveReadinessChecks(settings),
    canConfirmLive: admin.role === "OWNER",
  };
}

function editableData(data: AdminSettingsData) {
  const { liveReadinessConfirmed: _liveReadinessConfirmed, ...settings } = data;
  void _liveReadinessConfirmed;
  return settings;
}

export async function updateAdminSettings(data: AdminSettingsData, expectedUpdatedAt: string | null) {
  const admin = await requireCurrentAdmin();

  return prisma.$transaction(async (transaction) => {
    const current = await transaction.siteSettings.findUnique({
      where: { id: "default" },
      select: siteSettingsSelect,
    });
    if (current && current.updatedAt.toISOString() !== expectedUpdatedAt) {
      throw new AdminSettingsError("SETTINGS_CHANGED");
    }
    if (!current && expectedUpdatedAt !== null) throw new AdminSettingsError("SETTINGS_CHANGED");

    const next = editableData(data);
    if (admin.role !== "OWNER") {
      next.commercialHostingConfirmed = current?.commercialHostingConfirmed ?? false;
    }

    const previous = current ?? DEFAULT_SETTINGS;
    const changedKeys = (Object.keys(next) as Array<keyof typeof next>)
      .filter((key) => previous[key] !== next[key]);
    const readiness = getLiveReadinessChecks(next);
    const missing = readiness.filter((item) => !item.complete).map((item) => item.label);
    const ownerRequestedConfirmation = admin.role === "OWNER" && data.liveReadinessConfirmed;
    if (ownerRequestedConfirmation && missing.length > 0) {
      throw new AdminSettingsError("LIVE_READINESS_INCOMPLETE", missing);
    }

    const managerChangedOperations = admin.role !== "OWNER"
      && changedKeys.some((key) => key !== "brandName" && key !== "brandDescription");
    const remainsReady = missing.length === 0 && (
      admin.role === "OWNER"
        ? ownerRequestedConfirmation
        : current?.liveReadyAt !== null && !managerChangedOperations
    );
    const liveReadyAt = remainsReady ? current?.liveReadyAt ?? new Date() : null;
    const readinessChanged = previous.liveReadyAt?.getTime() !== liveReadyAt?.getTime();

    const saved = await transaction.siteSettings.upsert({
      where: { id: "default" },
      create: { id: "default", ...next, liveReadyAt, updatedByAdminId: admin.id },
      update: { ...next, liveReadyAt, updatedByAdminId: admin.id },
      select: { updatedAt: true },
    });

    const uniqueChangedKeys = [...new Set(changedKeys)];
    await transaction.adminAuditLog.create({
      data: {
        adminUserId: admin.id,
        action: "SETTINGS_UPDATED",
        summary: uniqueChangedKeys.length || readinessChanged
          ? `Настройки: ${[
            ...uniqueChangedKeys.map((key) => changedFieldLabels[key]),
            ...(readinessChanged ? ["подтверждение готовности live"] : []),
          ].join(", ")}`
          : "Настройки сохранены без изменения значений",
      },
    });

    return { updatedAt: saved.updatedAt, readiness, liveReadyAt };
  }, { isolationLevel: "Serializable" });
}

export function expirePublicSettingsCache() {
  updateTag(SETTINGS_CACHE_TAG);
}
