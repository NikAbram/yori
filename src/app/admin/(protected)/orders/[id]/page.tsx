import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, LockKeyhole } from "lucide-react";
import { notFound } from "next/navigation";

import {
  AdminNotificationRetryForm,
  AdminOrderNoteForm,
  AdminStatusForm,
} from "@/components/admin/admin-order-operations";
import { orderStatusLabels } from "@/data/orders";
import { adminOrderIdSchema } from "@/lib/admin-order-operations-schema";
import { formatMoney } from "@/lib/money";
import { getAdminOrderDetail, getAllowedAdminOrderStatuses } from "@/services/admin-orders";
import { MAX_NOTIFICATION_ATTEMPTS, NOTIFICATION_CLAIM_TIMEOUT_MS } from "@/services/notifications";

export const metadata: Metadata = { title: "Карточка заказа" };

// Administrative data and the AppShell pathname decision are request-bound.
export const instant = false;

const dateFormatter = new Intl.DateTimeFormat("ru-RU", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Europe/Samara",
});

const paymentLabels = {
  CASH_ON_DELIVERY: "Наличными при получении",
  CARD_ON_DELIVERY: "Картой при получении",
} as const;

const recipientLabels = { CUSTOMER: "Клиент", MANAGER: "Менеджер" } as const;
const eventLabels = {
  ORDER_CREATED: "Новый заказ",
  ORDER_CONFIRMED: "Подтверждение заказа",
  ORDER_STATUS_CHANGED: "Изменение статуса",
} as const;
const notificationStatusLabels = { PENDING: "Ожидает", SENT: "Отправлено", FAILED: "Ошибка" } as const;
const notificationErrorLabels: Record<string, string> = {
  telegram_forbidden: "Telegram отклонил доставку",
  telegram_rate_limited: "Telegram временно ограничил отправку",
  telegram_request_rejected: "Telegram отклонил запрос",
  telegram_delivery_failed: "Сбой доставки Telegram",
  configuration_unavailable: "Бот не настроен",
  recipient_unavailable: "Получатель недоступен",
  order_unavailable: "Заказ недоступен",
};
const actorLabels = { SYSTEM: "Система", TELEGRAM_USER: "Клиент", ADMIN: "Администратор" } as const;

function canRetryNotification(notification: {
  status: "PENDING" | "SENT" | "FAILED";
  attemptCount: number;
  lastAttemptAt: Date | null;
}) {
  if (notification.status === "SENT" || notification.attemptCount >= MAX_NOTIFICATION_ATTEMPTS) return false;
  if (notification.status === "FAILED" || notification.attemptCount === 0 || !notification.lastAttemptAt) return true;
  return Date.now() - notification.lastAttemptAt.getTime() >= NOTIFICATION_CLAIM_TIMEOUT_MS;
}
export default async function AdminOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const parsedId = adminOrderIdSchema.safeParse((await params).id);
  if (!parsedId.success) notFound();
  const order = await getAdminOrderDetail(parsedId.data);
  if (!order) notFound();

  const address = [
    order.city,
    `${order.street}, ${order.house}`,
    order.apartment ? `кв./офис ${order.apartment}` : null,
    order.entrance ? `подъезд ${order.entrance}` : null,
    order.floor ? `этаж ${order.floor}` : null,
  ].filter(Boolean).join(", ");

  return (
    <article className="admin-order-detail">
      <Link href="/admin/orders" className="admin-back-link"><ArrowLeft size={17} aria-hidden="true" /> Все заказы</Link>

      <header className="admin-order-detail-head">
        <div>
          <p>Заказ от {dateFormatter.format(order.createdAt)}</p>
          <h1>{order.orderNo}</h1>
          <div className="admin-order-flags">
            <span className="admin-status" data-status={order.status}>{orderStatusLabels[order.status]}</span>
            {order.isTest ? <em>Тестовый заказ</em> : null}
          </div>
        </div>
        <strong>{formatMoney(order.totalKopeks)}</strong>
      </header>

      <div className="admin-order-detail-grid">
        <div className="admin-order-primary">
          <section className="admin-detail-section" aria-labelledby="admin-order-items-title">
            <div className="admin-detail-heading"><span>Состав</span><h2 id="admin-order-items-title">Позиции заказа</h2></div>
            <ol className="admin-detail-items">
              {order.items.map((item) => (
                <li key={item.id}>
                  <span><b>{item.quantity} ×</b> {item.productNameSnapshot}<small>{formatMoney(item.unitPriceKopeks)} за единицу</small></span>
                  <strong>{formatMoney(item.lineTotalKopeks)}</strong>
                </li>
              ))}
            </ol>
            <dl className="admin-detail-totals">
              <div><dt>Блюда</dt><dd>{formatMoney(order.subtotalKopeks)}</dd></div>
              <div><dt>Доставка</dt><dd>{order.deliveryKopeks ? formatMoney(order.deliveryKopeks) : "Бесплатно"}</dd></div>
              {order.discountKopeks ? <div><dt>Скидка</dt><dd>−{formatMoney(order.discountKopeks)}</dd></div> : null}
              <div><dt>Итого</dt><dd>{formatMoney(order.totalKopeks)}</dd></div>
            </dl>
          </section>

          <section className="admin-detail-section" aria-labelledby="admin-order-customer-title">
            <div className="admin-detail-heading"><span>Получатель</span><h2 id="admin-order-customer-title">Контакты и доставка</h2></div>
            <dl className="admin-contact-list">
              <div><dt>Имя</dt><dd>{order.recipientName}</dd></div>
              <div><dt>Телефон</dt><dd><a href={`tel:${order.phone.replace(/[^+\d]/g, "")}`}>{order.phone}</a></dd></div>
              <div><dt>Адрес</dt><dd>{address}</dd></div>
              <div><dt>Оплата</dt><dd>{paymentLabels[order.paymentMethod]}</dd></div>
              {order.customerNote ? <div><dt>Комментарий клиента</dt><dd>{order.customerNote}</dd></div> : null}
            </dl>
          </section>

          <section className="admin-detail-section" aria-labelledby="admin-notes-title">
            <div className="admin-detail-heading"><span>Только CRM</span><h2 id="admin-notes-title">Внутренние заметки</h2></div>
            <AdminOrderNoteForm orderId={order.id} />
            {order.internalNotes.length ? (
              <ol className="admin-note-list">
                {order.internalNotes.map((note) => (
                  <li key={note.id}><p>{note.body}</p><small>{note.adminUser.name} · {dateFormatter.format(note.createdAt)}</small></li>
                ))}
              </ol>
            ) : <p className="admin-detail-empty">Внутренних заметок пока нет.</p>}
          </section>
        </div>

        <aside className="admin-order-operations" aria-label="Обработка заказа">
          <section className="admin-workflow-panel">
            <span>Workflow</span>
            <h2>Обработка</h2>
            <AdminStatusForm orderId={order.id} allowedStatuses={getAllowedAdminOrderStatuses(order.status)} />
            <ol className="admin-history-list">
              {order.statusHistory.map((entry) => (
                <li key={entry.id} data-current={entry.toStatus === order.status ? "true" : undefined}>
                  <i aria-hidden="true" />
                  <div>
                    <strong>{orderStatusLabels[entry.toStatus]}</strong>
                    <p>{entry.fromStatus ? `${orderStatusLabels[entry.fromStatus]} → ` : ""}{orderStatusLabels[entry.toStatus]}</p>
                    <small>{entry.adminUser?.name ?? actorLabels[entry.actorType]} · {dateFormatter.format(entry.createdAt)}</small>
                  </div>
                </li>
              ))}
            </ol>
          </section>

          <section className="admin-operation-section" aria-labelledby="admin-notifications-title">
            <div className="admin-detail-heading"><span>Telegram</span><h2 id="admin-notifications-title">Уведомления</h2></div>
            {order.notifications.length ? (
              <ol className="admin-notification-list">
                {order.notifications.map((notification) => (
                  <li key={notification.id} data-status={notification.status}>
                    <div><strong>{eventLabels[notification.eventType]}</strong><span>{notificationStatusLabels[notification.status]}</span></div>
                    <p>{recipientLabels[notification.recipientType]} · попыток: {notification.attemptCount}/{MAX_NOTIFICATION_ATTEMPTS}</p>
                    {notification.errorText ? <small>{notificationErrorLabels[notification.errorText] ?? "Ошибка доставки"}</small> : null}
                    {canRetryNotification(notification) ? <AdminNotificationRetryForm orderId={order.id} notificationId={notification.id} /> : null}
                  </li>
                ))}
              </ol>
            ) : <p className="admin-detail-empty">Событий отправки пока нет.</p>}
          </section>

          <section className="admin-operation-section" aria-labelledby="admin-audit-title">
            <div className="admin-detail-heading"><span>Контроль</span><h2 id="admin-audit-title">Аудит</h2></div>
            {order.adminAuditLogs.length ? (
              <ol className="admin-audit-list">
                {order.adminAuditLogs.map((entry) => (
                  <li key={entry.id}><strong>{entry.summary}</strong><small>{entry.adminUser.name} · {dateFormatter.format(entry.createdAt)}</small></li>
                ))}
              </ol>
            ) : <p className="admin-detail-empty"><LockKeyhole size={16} aria-hidden="true" /> Операций администратора пока нет.</p>}
          </section>
        </aside>
      </div>
    </article>
  );
}

