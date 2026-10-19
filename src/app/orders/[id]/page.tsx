import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, LockKeyhole } from "lucide-react";
import { notFound } from "next/navigation";
import { getOrderPreview, getOrderStatusIndex, orderStatusSteps, previewOrder } from "@/data/orders";
import { formatMoney } from "@/lib/money";

type PageProps = { params: Promise<{ id: string }> };

export const metadata: Metadata = {
  title: "Статус заказа",
  robots: { index: false, follow: false },
};

export function generateStaticParams() {
  return [{ id: previewOrder.id }];
}

export default async function OrderDetailPage({ params }: PageProps) {
  const order = getOrderPreview((await params).id);
  if (!order) notFound();
  const currentIndex = getOrderStatusIndex(order.status);

  return (
    <article className="page-width order-detail">
      <Link href="/orders" className="text-button"><ArrowLeft size={17} aria-hidden="true" /> К заказам</Link>

      <header className="order-detail-head">
        <div>
          <p className="section-caption">Так будет выглядеть ваш заказ</p>
          <h1 className="display">{order.orderNo}</h1>
          <p>{order.placedAtLabel}</p>
        </div>
        <span className="status-seal">{order.statusLabel}</span>
      </header>

      <div className="order-detail-layout">
        <section className="order-track" aria-labelledby="status-title">
          <h2 id="status-title" className="display">Статус</h2>
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
              <li key={item.productNameSnapshot}>
                <span><strong>{item.quantity} ×</strong> {item.productNameSnapshot}</span>
                <span>{formatMoney(item.unitPriceKopeks * item.quantity)}</span>
              </li>
            ))}
          </ul>
          <dl>
            <div><dt>Блюда</dt><dd>{formatMoney(order.subtotalKopeks)}</dd></div>
            <div><dt>Доставка</dt><dd>{formatMoney(order.deliveryKopeks)}</dd></div>
            <div className="receipt-total"><dt>Итого</dt><dd>{formatMoney(order.totalKopeks)}</dd></div>
          </dl>
          <p>Адрес и способ оплаты появятся только в защищённом личном заказе.</p>
        </aside>
      </div>
    </article>
  );
}
