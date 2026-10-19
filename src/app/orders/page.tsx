import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, LockKeyhole, ReceiptText } from "lucide-react";
import { previewOrder } from "@/data/orders";
import { formatMoney } from "@/lib/money";

export const metadata: Metadata = {
  title: "Заказы",
  robots: { index: false, follow: false },
};

export default function OrdersPage() {
  return (
    <div className="page-width account-page">
      <header className="account-heading">
        <p className="hero-kicker">Личный раздел</p>
        <h1 className="display">Заказы</h1>
        <p>История появится здесь после безопасного входа через Telegram.</p>
      </header>

      <div className="orders-layout">
        <section className="auth-gate" aria-labelledby="orders-access-title">
          <LockKeyhole size={28} strokeWidth={1.7} aria-hidden="true" />
          <div>
            <h2 id="orders-access-title">Личные данные скрыты</h2>
            <p>В обычном браузере мы не показываем заказы. Откройте YŌRI из Telegram — после проверки аккаунта здесь будет только ваша история.</p>
          </div>
        </section>

        <section aria-labelledby="order-preview-title">
          <div className="section-head compact-head">
            <div>
              <p className="section-caption">Как будет выглядеть статус</p>
              <h2 id="order-preview-title" className="section-title display">Путь заказа</h2>
            </div>
          </div>
          <Link className="order-preview" href={`/orders/${previewOrder.id}`}>
            <span className="order-preview-mark"><ReceiptText size={24} aria-hidden="true" /></span>
            <span className="order-preview-copy">
              <strong>{previewOrder.orderNo}</strong>
              <small>{previewOrder.items.length} позиции · {formatMoney(previewOrder.totalKopeks)}</small>
            </span>
            <span className="order-preview-status">{previewOrder.statusLabel}</span>
            <ArrowRight size={20} aria-hidden="true" />
          </Link>
          <p className="preview-note">Это только образец отображения. Позиции не оформлены и не переданы ресторану.</p>
        </section>
      </div>
    </div>
  );
}
