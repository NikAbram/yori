import "server-only";

import { prisma } from "@/lib/db/prisma";
import { getOptionalTelegramManagerChatId } from "@/lib/telegram/bot-config";

const TELEGRAM_ID_PATTERN = /^[1-9]\d{0,31}$/;

const settingsSelect = {
  isOrderingEnabled: true,
  cashOnDeliveryEnabled: true,
  cardOnDeliveryEnabled: true,
  contactText: true,
  deliveryTerms: true,
  privacyText: true,
  operatorName: true,
  managerTelegramChatId: true,
  commercialHostingConfirmed: true,
  liveReadyAt: true,
} as const;

export type OrderAccessSession = {
  telegramId: string;
  allowPrivateTest: boolean;
};

export type OrderAccess = {
  allowed: boolean;
  isTest: boolean;
  cashOnDeliveryEnabled: boolean;
  cardOnDeliveryEnabled: boolean;
};

const CLOSED_ACCESS: OrderAccess = {
  allowed: false,
  isTest: true,
  cashOnDeliveryEnabled: false,
  cardOnDeliveryEnabled: false,
};

export function parsePrivateTestAllowlist(raw = process.env.ALLOWED_TELEGRAM_USER_IDS) {
  if (!raw?.trim()) return new Set<string>();

  const ids = raw.split(",").map((value) => value.trim()).filter(Boolean);
  if (ids.some((id) => !TELEGRAM_ID_PATTERN.test(id))) {
    throw new Error("ALLOWED_TELEGRAM_USER_IDS contains an invalid Telegram ID.");
  }

  return new Set(ids);
}

export function isPrivateTestAllowlisted(telegramId: string) {
  try {
    return parsePrivateTestAllowlist().has(telegramId);
  } catch {
    return false;
  }
}

function hasText(value: string | null) {
  return Boolean(value?.trim());
}

export async function getOrderAccess(session: OrderAccessSession | null): Promise<OrderAccess> {
  const mode = process.env.ORDER_MODE;

  if (mode === "private_test") {
    if (
      !session ||
      !session.allowPrivateTest ||
      !isPrivateTestAllowlisted(session.telegramId)
    ) {
      return CLOSED_ACCESS;
    }
  } else if (mode !== "live" || !session) {
    return CLOSED_ACCESS;
  }

  const settings = await prisma.siteSettings.findUnique({
    where: { id: "default" },
    select: settingsSelect,
  });
  if (!settings) return CLOSED_ACCESS;

  const paymentEnabled = settings.cashOnDeliveryEnabled || settings.cardOnDeliveryEnabled;
  if (!settings.isOrderingEnabled || !paymentEnabled) return CLOSED_ACCESS;

  if (mode === "live") {
    const liveReady = settings.commercialHostingConfirmed
      && settings.liveReadyAt !== null
      && hasText(settings.operatorName)
      && hasText(settings.deliveryTerms)
      && hasText(settings.contactText)
      && hasText(settings.privacyText)
      && Boolean(settings.managerTelegramChatId ?? getOptionalTelegramManagerChatId());
    if (!liveReady) return CLOSED_ACCESS;
  }

  return {
    allowed: true,
    isTest: mode === "private_test",
    cashOnDeliveryEnabled: settings.cashOnDeliveryEnabled,
    cardOnDeliveryEnabled: settings.cardOnDeliveryEnabled,
  };
}
