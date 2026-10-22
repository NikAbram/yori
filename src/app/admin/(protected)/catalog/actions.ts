"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import {
  adminCategoryInputSchema,
  adminProductInputSchema,
} from "@/lib/admin-catalog-schema";
import {
  AdminCatalogError,
  createAdminCategory,
  createAdminProduct,
  deleteAdminCategory,
  deleteAdminProduct,
  updateAdminCategory,
  updateAdminProduct,
} from "@/services/admin-catalog";
import { expirePublicCatalogCache } from "@/services/catalog";

export type AdminCatalogActionState = {
  status: "idle" | "error";
  message: string;
  fieldErrors?: Record<string, string[]>;
};

const saveEnvelopeSchema = z.object({
  entityId: z.uuid().nullable(),
  data: z.unknown(),
});

const deleteSchema = z.object({
  entityId: z.uuid(),
  confirmation: z.string(),
}).refine((value) => value.confirmation === value.entityId, {
  path: ["confirmation"],
  message: "Подтвердите удаление.",
});

function mutationErrorMessage(error: unknown) {
  if (!(error instanceof AdminCatalogError)) return "Не удалось сохранить изменения. Повторите попытку.";
  if (error.code === "SLUG_TAKEN") return "Такой slug уже используется. Укажите другой.";
  if (error.code === "CATEGORY_NOT_EMPTY") return "Сначала перенесите или удалите товары этой категории.";
  if (error.code === "CATEGORY_REQUIRED") return "Выбранная категория больше недоступна. Обновите страницу.";
  return "Запись больше не существует. Обновите список каталога.";
}

function refreshCatalogViews() {
  expirePublicCatalogCache();
  revalidatePath("/admin/catalog");
  revalidatePath("/");
  revalidatePath("/catalog");
  revalidatePath("/product/[slug]", "page");
  revalidatePath("/cart");
  revalidatePath("/checkout");
}

export async function saveCategoryAction(
  _previousState: AdminCatalogActionState,
  rawInput: unknown,
): Promise<AdminCatalogActionState> {
  const envelope = saveEnvelopeSchema.safeParse(rawInput);
  if (!envelope.success) return { status: "error", message: "Некорректный запрос. Обновите страницу." };

  const parsed = adminCategoryInputSchema.safeParse(envelope.data.data);
  if (!parsed.success) {
    return {
      status: "error",
      message: "Проверьте поля категории.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    if (envelope.data.entityId) await updateAdminCategory(envelope.data.entityId, parsed.data);
    else await createAdminCategory(parsed.data);
  } catch (error) {
    return { status: "error", message: mutationErrorMessage(error) };
  }

  refreshCatalogViews();
  redirect("/admin/catalog?result=category-saved");
}

export async function saveProductAction(
  _previousState: AdminCatalogActionState,
  rawInput: unknown,
): Promise<AdminCatalogActionState> {
  const envelope = saveEnvelopeSchema.safeParse(rawInput);
  if (!envelope.success) return { status: "error", message: "Некорректный запрос. Обновите страницу." };

  const parsed = adminProductInputSchema.safeParse(envelope.data.data);
  if (!parsed.success) {
    return {
      status: "error",
      message: "Проверьте поля товара.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    if (envelope.data.entityId) await updateAdminProduct(envelope.data.entityId, parsed.data);
    else await createAdminProduct(parsed.data);
  } catch (error) {
    return { status: "error", message: mutationErrorMessage(error) };
  }

  refreshCatalogViews();
  redirect("/admin/catalog?result=product-saved");
}

export async function deleteCategoryAction(
  _previousState: AdminCatalogActionState,
  formData: FormData,
): Promise<AdminCatalogActionState> {
  const parsed = deleteSchema.safeParse({
    entityId: formData.get("entityId"),
    confirmation: formData.get("confirmation"),
  });
  if (!parsed.success) return { status: "error", message: "Подтвердите удаление категории." };

  try {
    await deleteAdminCategory(parsed.data.entityId);
  } catch (error) {
    return { status: "error", message: mutationErrorMessage(error) };
  }

  refreshCatalogViews();
  redirect("/admin/catalog?result=category-deleted");
}

export async function deleteProductAction(
  _previousState: AdminCatalogActionState,
  formData: FormData,
): Promise<AdminCatalogActionState> {
  const parsed = deleteSchema.safeParse({
    entityId: formData.get("entityId"),
    confirmation: formData.get("confirmation"),
  });
  if (!parsed.success) return { status: "error", message: "Подтвердите удаление товара." };

  try {
    await deleteAdminProduct(parsed.data.entityId);
  } catch (error) {
    return { status: "error", message: mutationErrorMessage(error) };
  }

  refreshCatalogViews();
  redirect("/admin/catalog?result=product-deleted");
}
