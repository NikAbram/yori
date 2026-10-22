import Link from "next/link";

import { orderStatusLabels } from "@/data/orders";
import { formatMoney } from "@/lib/money";
import type { OrderStatus } from "@/types/orders";

type AdminOrderListItem = {
  id: string;
  orderNo: string;
  recipientName: string;
  phone: string;
  totalKopeks: number;
  paymentMethod: "CASH_ON_DELIVERY" | "CARD_ON_DELIVERY";
  status: OrderStatus;
  isTest: boolean;
  createdAt: Date;
  items: Array<{ productNameSnapshot: string; quantity: number }>;
};

const dateFormatter = new Intl.DateTimeFormat("ru-RU", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

const paymentLabels: Record<AdminOrderListItem["paymentMethod"], string> = {
  CASH_ON_DELIVERY: "Наличными при получении",
  CARD_ON_DELIVERY: "Картой при получении",
};

export function AdminOrderList({ orders, compact = false }: { orders: AdminOrderListItem[]; compact?: boolean }) {
  if (orders.length === 0) {
    return (
      <div className="admin-empty">
        <span aria-hidden="true">0</span>
        <h2>Заказов не найдено</h2>
        <p>Измените период или сбросьте фильтры, чтобы увидеть другие заказы.</p>
      </div>
    );
  }

  return (
    <div className="admin-orders-table" role="region" aria-label="Список заказов" tabIndex={0}>
      <div className="admin-orders-head" aria-hidden="true">
        <span>Заказ</span><span>Клиент</span><span>Состав</span><span>Оплата</span><span>Сумма</span><span>Статус</span>
      </div>
      <ol className="admin-orders-list">
        {orders.map((order) => {
          const itemCount = order.items.reduce((sum, item) => sum + item.quantity, 0);
          const visibleItemCount = compact ? 1 : 2;
          const itemSummary = order.items.slice(0, visibleItemCount)
            .map((item) => `${item.quantity} × ${item.productNameSnapshot}`).join(", ");
          const remaining = Math.max(0, order.items.length - visibleItemCount);

          return (
            <li className="admin-order-row" data-status={order.status} key={order.id}>
              <div className="admin-order-number">
                <Link href={`/admin/orders/${order.id}`} aria-label={`Открыть заказ ${order.orderNo}`}><strong>{order.orderNo}</strong></Link>
                <time dateTime={order.createdAt.toISOString()}>{dateFormatter.format(order.createdAt)}</time>
                {order.isTest ? <em>Тестовый</em> : null}
              </div>
              <div className="admin-order-customer">
                <strong>{order.recipientName}</strong>
                <a href={`tel:${order.phone.replace(/[^+\d]/g, "")}`}>{order.phone}</a>
              </div>
              <div className="admin-order-items">
                <span>{itemSummary}{remaining > 0 ? `, ещё ${remaining}` : ""}</span>
                <small>{itemCount} шт. · доставка</small>
              </div>
              <span className="admin-order-payment">{paymentLabels[order.paymentMethod]}</span>
              <strong className="admin-order-total">{formatMoney(order.totalKopeks)}</strong>
              <span className="admin-status" data-status={order.status}>{orderStatusLabels[order.status]}</span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
