"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { adminSettingsInputSchema } from "@/lib/admin-settings-schema";
import {
  AdminSettingsError,
  expirePublicSettingsCache,
  updateAdminSettings,
} from "@/services/settings";

export type AdminSettingsActionState = {
  status: "idle" | "error";
  message: string;
  fieldErrors?: Record<string, string[]>;
};

const envelopeSchema = z.object({
  expectedUpdatedAt: z.iso.datetime().nullable(),
  data: z.unknown(),
});

function settingsErrorMessage(error: unknown) {
  if (!(error instanceof AdminSettingsError)) {
    return "Не удалось сохранить настройки. Повторите попытку.";
  }
  if (error.code === "SETTINGS_CHANGED") {
    return "Настройки уже изменены в другой вкладке. Обновите страницу и повторите правку.";
  }
  return `Нельзя подтвердить готовность: ${error.missing.join(", ").toLocaleLowerCase("ru")}.`;
}

export async function saveSettingsAction(
  _previousState: AdminSettingsActionState,
  rawInput: unknown,
): Promise<AdminSettingsActionState> {
  const envelope = envelopeSchema.safeParse(rawInput);
  if (!envelope.success) return { status: "error", message: "Некорректный запрос. Обновите страницу." };

  const parsed = adminSettingsInputSchema.safeParse(envelope.data.data);
  if (!parsed.success) {
    return {
      status: "error",
      message: "Проверьте поля настроек.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    await updateAdminSettings(parsed.data, envelope.data.expectedUpdatedAt);
  } catch (error) {
    return { status: "error", message: settingsErrorMessage(error) };
  }

  expirePublicSettingsCache();
  revalidatePath("/admin/settings");
  revalidatePath("/");
  revalidatePath("/cart");
  revalidatePath("/checkout");
  revalidatePath("/delivery");
  revalidatePath("/help");
  revalidatePath("/privacy");
  redirect("/admin/settings?result=saved");
}
