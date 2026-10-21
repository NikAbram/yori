import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, LockKeyhole, ReceiptText } from "lucide-react";
import { Suspense } from "react";

import { StatePanel } from "@/components/miniapp/state-panel";
import { orderStatusLabels } from "@/data/orders";
import { formatMoney } from "@/lib/money";
import { listCustomerOrders } from "@/services/customer-orders";
import { getCurrentTelegramSession } from "@/services/telegram-auth";

export const metadata: Metadata = {
  title: "Заказы",
  robots: { index: false, follow: false },
};

const orderDateFormatter = new Intl.DateTimeFormat("ru-RU", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Europe/Samara",
});

export default function OrdersPage() {
  return (
    <div className="page-width account-page">
      <header className="account-heading">
        <p className="hero-kicker">Личный раздел</p>
        <h1 className="display">Заказы</h1>
        <p>История доступна после безопасного входа через Telegram.</p>
      </header>
      <Suspense fallback={<div className="skeleton" style={{ minHeight: 180, borderRadius: 18 }} role="status" aria-live="polite" aria-busy="true"><span className="visually-hidden">Загружаем заказы</span></div>}>
        <OrdersContent />
      </Suspense>
    </div>
  );
}

async function OrdersContent() {
  const session = await getCurrentTelegramSession();
  if (!session) {
    return (
        <section className="auth-gate" aria-labelledby="orders-access-title">
          <LockKeyhole size={28} strokeWidth={1.7} aria-hidden="true" />
          <div>
            <h2 id="orders-access-title">Личные данные скрыты</h2>
            <p>Откройте YŌRI из Telegram. После проверки аккаунта здесь будут показаны только ваши заказы.</p>
          </div>
        </section>
    );
  }

  return <CustomerOrderList userId={session.userId} />;
}

async function CustomerOrderList({ userId }: { userId: string }) {
  const orders = await listCustomerOrders(userId);

  if (!orders.length) {
    return (
      <StatePanel
        icon={ReceiptText}
        title="Заказов пока нет"
        description="Соберите корзину и оформите первый заказ, когда приём будет доступен."
        action={{ href: "/catalog", label: "Открыть меню" }}
      />
    );
  }

  return (
    <section aria-labelledby="customer-orders-title">
      <div className="section-head compact-head">
        <div>
          <p className="section-caption">Последние заказы</p>
          <h2 id="customer-orders-title" className="section-title display">История</h2>
        </div>
      </div>
      <div className="customer-orders-list">
        {orders.map((order) => (
          <Link className="order-preview" href={`/orders/${order.id}`} key={order.id}>
            <span className="order-preview-mark"><ReceiptText size={24} aria-hidden="true" /></span>
            <span className="order-preview-copy">
              <strong>{order.orderNo}</strong>
              <small>{order.itemCount} поз. · {formatMoney(order.totalKopeks)} · {orderDateFormatter.format(order.createdAt)}</small>
            </span>
            <span className="order-preview-status">{orderStatusLabels[order.status]}</span>
            <ArrowRight size={20} aria-hidden="true" />
          </Link>
        ))}
      </div>
    </section>
  );
}
