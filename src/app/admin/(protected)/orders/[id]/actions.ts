"use server";

import { after } from "next/server";
import { revalidatePath } from "next/cache";

import {
  addOrderNoteSchema,
  changeOrderStatusSchema,
  retryOrderNotificationSchema,
} from "@/lib/admin-order-operations-schema";
import {
  addAdminOrderNote,
  AdminOrderOperationError,
  changeAdminOrderStatus,
  retryAdminOrderNotification,
} from "@/services/admin-orders";
import { deliverPendingNotification } from "@/services/notifications";

export type AdminOrderActionState = {
  status: "idle" | "success" | "error";
  message: string;
};

function refreshOrderViews(orderId: string) {
  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath("/admin/orders");
  revalidatePath("/admin");
  revalidatePath(`/orders/${orderId}`);
  revalidatePath("/orders");
}
function operationErrorMessage(error: unknown) {
  if (error instanceof AdminOrderOperationError) {
    if (error.code === "INVALID_STATUS_TRANSITION") return "Этот переход статуса больше недоступен. Обновите страницу.";
    if (error.code === "ORDER_CHANGED") return "Заказ уже изменён другим сотрудником. Обновите страницу.";
    if (error.code === "NOTIFICATION_NOT_FOUND") return "Уведомление не относится к этому заказу.";
    return "Заказ не найден.";
  }
  return "Не удалось выполнить действие. Повторите попытку.";
}

export async function changeOrderStatusAction(
  _previousState: AdminOrderActionState,
  formData: FormData,
): Promise<AdminOrderActionState> {
  const parsed = changeOrderStatusSchema.safeParse({
    orderId: formData.get("orderId"),
    status: formData.get("status"),
  });
  if (!parsed.success) return { status: "error", message: "Проверьте выбранный статус." };

  try {
    const result = await changeAdminOrderStatus(parsed.data.orderId, parsed.data.status);
    after(async () => {
      try {
        await deliverPendingNotification(result.notificationId);
      } catch {
        // The durable notification journal remains the source for a later manual retry.
      }
    });
    refreshOrderViews(parsed.data.orderId);
    return { status: "success", message: "Статус изменён и записан в историю." };
  } catch (error) {
    return { status: "error", message: operationErrorMessage(error) };
  }
}

export async function addOrderNoteAction(
  _previousState: AdminOrderActionState,
  formData: FormData,
): Promise<AdminOrderActionState> {
  const parsed = addOrderNoteSchema.safeParse({
    orderId: formData.get("orderId"),
    body: formData.get("body"),
  });
  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message ?? "Проверьте текст заметки." };
  }

  try {
    await addAdminOrderNote(parsed.data.orderId, parsed.data.body);
    refreshOrderViews(parsed.data.orderId);
    return { status: "success", message: "Заметка добавлена." };
  } catch (error) {
    return { status: "error", message: operationErrorMessage(error) };
  }
}

export async function retryOrderNotificationAction(
  _previousState: AdminOrderActionState,
  formData: FormData,
): Promise<AdminOrderActionState> {
  const parsed = retryOrderNotificationSchema.safeParse({
    orderId: formData.get("orderId"),
    notificationId: formData.get("notificationId"),
  });
  if (!parsed.success) return { status: "error", message: "Уведомление не найдено." };

  try {
    const result = await retryAdminOrderNotification(parsed.data.orderId, parsed.data.notificationId);
    refreshOrderViews(parsed.data.orderId);
    if (result.outcome === "sent" || result.outcome === "already-sent") {
      return { status: "success", message: "Уведомление отправлено." };
    }
    if (result.outcome === "attempts-exhausted") {
      return { status: "error", message: "Лимит ручных попыток исчерпан." };
    }
    if (result.outcome === "not-claimable") {
      return { status: "error", message: "Уведомление уже обрабатывается. Обновите страницу позже." };
    }
    return { status: "error", message: "Отправка не выполнена. Состояние сохранено в журнале." };
  } catch (error) {
    return { status: "error", message: operationErrorMessage(error) };
  }
}

