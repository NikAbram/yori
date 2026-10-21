import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, LockKeyhole } from "lucide-react";
import { notFound } from "next/navigation";
import { z } from "zod";

import { StatePanel } from "@/components/miniapp/state-panel";
import { getOrderStatusIndex, orderStatusLabels, orderStatusSteps } from "@/data/orders";
import { formatMoney } from "@/lib/money";
import { getCustomerOrder } from "@/services/customer-orders";
import { getCurrentTelegramSession } from "@/services/telegram-auth";

type PageProps = { params: Promise<{ id: string }> };

export const metadata: Metadata = {
  title: "Статус заказа",
  robots: { index: false, follow: false },
};

// Personal order data depends on a request-time session, so this route may block on it.
export const instant = false;

const orderDateFormatter = new Intl.DateTimeFormat("ru-RU", {
  dateStyle: "long",
  timeStyle: "short",
  timeZone: "Europe/Samara",
});

export default async function OrderDetailPage({ params }: PageProps) {
  const [session, routeParams] = await Promise.all([
    getCurrentTelegramSession(),
    params,
  ]);
  if (!session) {
    return (
      <div className="page-width route-state-wrap">
        <StatePanel icon={LockKeyhole} title="Откройте заказ в Telegram" description="Для просмотра личных данных нужно подтвердить Telegram-сессию." action={{ href: "/orders", label: "К заказам" }} />
      </div>
    );
  }

  const parsedId = z.uuid().safeParse(routeParams.id);
  if (!parsedId.success) notFound();
  const order = await getCustomerOrder(session.userId, parsedId.data);
  if (!order) notFound();

  const currentIndex = getOrderStatusIndex(order.status);
  const address = [order.city, `${order.street}, ${order.house}`, order.apartment ? `кв./офис ${order.apartment}` : null]
    .filter(Boolean)
    .join(", ");

  return (
    <article className="page-width order-detail">
      <Link href="/orders" className="text-button"><ArrowLeft size={17} aria-hidden="true" /> К заказам</Link>

      <header className="order-detail-head">
        <div>
          <p className="section-caption">Заказ от {orderDateFormatter.format(order.createdAt)}</p>
          <h1 className="display">{order.orderNo}</h1>
          <p>{order.recipientName} · {address}</p>
        </div>
        <span className="status-seal">{orderStatusLabels[order.status]}</span>
      </header>

      <div className="order-detail-layout">
        <section className="order-track" aria-labelledby="status-title">
          <h2 id="status-title" className="display">Статус</h2>
          {order.status === "CANCELLED" ? <p className="order-cancelled">Заказ отменён. Если нужна помощь, откройте раздел поддержки.</p> : null}
          <ol>
            {orderStatusSteps.map((step, index) => {
              const state = index < currentIndex ? "done" : index === currentIndex ? "current" : "upcoming";
              return (
                <li key={step.status} data-state={state} aria-current={state === "current" ? "step" : undefined}>
                  <span className="track-dot" aria-hidden="true" />
                  <div><strong>{step.label}</strong><p>{step.description}</p></div>
                </li>
              );
            })}
          </ol>
        </section>

        <aside className="order-receipt" aria-label="Состав и сумма заказа">
          <div className="receipt-top"><span>Состав</span><LockKeyhole size={18} aria-hidden="true" /></div>
          <ul>
            {order.items.map((item) => (
              <li key={item.id}>
                <span><strong>{item.quantity} ×</strong> {item.productNameSnapshot}</span>
                <span>{formatMoney(item.lineTotalKopeks)}</span>
              </li>
            ))}
          </ul>
          <dl>
            <div><dt>Блюда</dt><dd>{formatMoney(order.subtotalKopeks)}</dd></div>
            <div><dt>Доставка</dt><dd>{order.deliveryKopeks ? formatMoney(order.deliveryKopeks) : "Бесплатно"}</dd></div>
            {order.discountKopeks ? <div><dt>Скидка</dt><dd>−{formatMoney(order.discountKopeks)}</dd></div> : null}
            <div className="receipt-total"><dt>Итого</dt><dd>{formatMoney(order.totalKopeks)}</dd></div>
          </dl>
          <div className="order-private-details">
            <p><strong>Оплата:</strong> {order.paymentMethod === "CASH_ON_DELIVERY" ? "наличными при получении" : "картой при получении"}</p>
            <p><strong>Телефон:</strong> {order.phone}</p>
            <p><strong>Адрес:</strong> {address}</p>
            {order.customerNote ? <p><strong>Комментарий:</strong> {order.customerNote}</p> : null}
          </div>
        </aside>
      </div>
    </article>
  );
}
