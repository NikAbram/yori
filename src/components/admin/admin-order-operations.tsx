"use client";

import { useActionState } from "react";

import {
  addOrderNoteAction,
  changeOrderStatusAction,
  retryOrderNotificationAction,
} from "@/app/admin/(protected)/orders/[id]/actions";
import type { AdminOrderActionState } from "@/app/admin/(protected)/orders/[id]/actions";
import { orderStatusLabels } from "@/data/orders";
import type { OrderStatus } from "@/types/orders";

const initialAdminOrderActionState: AdminOrderActionState = { status: "idle", message: "" };

function ActionMessage({ state }: { state: AdminOrderActionState }) {
  return state.message ? (
    <p className="admin-action-message" data-state={state.status} role="status">{state.message}</p>
  ) : null;
}
export function AdminStatusForm({
  orderId,
  allowedStatuses,
}: {
  orderId: string;
  allowedStatuses: readonly OrderStatus[];
}) {
  const [state, action, pending] = useActionState(changeOrderStatusAction, initialAdminOrderActionState);
  if (allowedStatuses.length === 0) {
    return <p className="admin-terminal-note">Заказ находится в финальном статусе.</p>;
  }

  return (
    <form action={action} className="admin-status-form">
      <input type="hidden" name="orderId" value={orderId} />
      <label htmlFor="admin-next-status">Следующий статус</label>
      <select id="admin-next-status" name="status" defaultValue={allowedStatuses[0]} disabled={pending}>
        {allowedStatuses.map((status) => <option key={status} value={status}>{orderStatusLabels[status]}</option>)}
      </select>
      <button type="submit" disabled={pending}>{pending ? "Сохраняем…" : "Изменить статус"}</button>
      <ActionMessage state={state} />
    </form>
  );
}

export function AdminOrderNoteForm({ orderId }: { orderId: string }) {
  const [state, action, pending] = useActionState(addOrderNoteAction, initialAdminOrderActionState);
  return (
    <form action={action} className="admin-note-form">
      <input type="hidden" name="orderId" value={orderId} />
      <label htmlFor="admin-order-note">Новая внутренняя заметка</label>
      <textarea id="admin-order-note" name="body" required maxLength={1000} rows={4} disabled={pending} placeholder="Например, согласовали замену позиции" />
      <div><small>Только для сотрудников · до 1000 символов</small><button type="submit" disabled={pending}>{pending ? "Добавляем…" : "Добавить заметку"}</button></div>
      <ActionMessage state={state} />
    </form>
  );
}

export function AdminNotificationRetryForm({ orderId, notificationId }: { orderId: string; notificationId: string }) {
  const [state, action, pending] = useActionState(retryOrderNotificationAction, initialAdminOrderActionState);
  return (
    <form action={action} className="admin-retry-form">
      <input type="hidden" name="orderId" value={orderId} />
      <input type="hidden" name="notificationId" value={notificationId} />
      <button type="submit" disabled={pending}>{pending ? "Отправляем…" : "Повторить отправку"}</button>
      <ActionMessage state={state} />
    </form>
  );
}

