import type { Metadata } from "next";
import Link from "next/link";

import { AdminOrderList } from "@/components/admin/admin-order-list";
import { parseDashboardPeriod } from "@/lib/admin-orders-schema";
import { formatMoney } from "@/lib/money";
import { getAdminDashboard } from "@/services/admin-orders";

export const metadata: Metadata = { title: "Сводка" };

export const instant = false;

export default async function AdminHomePage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string | string[] }>;
}) {
  const periodDays = parseDashboardPeriod((await searchParams).period);
  const dashboard = await getAdminDashboard(periodDays);

  return (
    <div className="admin-workspace">
      <section className="admin-dashboard-head" aria-labelledby="admin-dashboard-title">
        <div>
          <p>Операционная сводка</p>
          <h1 id="admin-dashboard-title">Сегодня видно главное</h1>
        </div>
        <form className="admin-period-form" method="get">
          <label htmlFor="dashboard-period">Период</label>
          <select id="dashboard-period" name="period" defaultValue={String(periodDays)}>
            <option value="7">7 дней</option>
            <option value="30">30 дней</option>
            <option value="90">90 дней</option>
          </select>
          <button type="submit">Показать</button>
        </form>
      </section>

      <section className="admin-metrics" aria-label={`Показатели за ${periodDays} дней`}>
        <article>
          <span>Заказов</span>
          <strong>{dashboard.orderCount}</strong>
          <small>включая {dashboard.testOrderCount} тестовых</small>
        </article>
        <article data-accent="true">
          <span>Новых</span>
          <strong>{dashboard.newOrderCount}</strong>
          <small>ждут начала обработки</small>
        </article>
        <article>
          <span>Реальная выручка</span>
          <strong>{formatMoney(dashboard.deliveredRevenueKopeks)}</strong>
          <small>только доставленные, без тестовых</small>
        </article>
      </section>

      <section className="admin-recent" aria-labelledby="admin-recent-title">
        <div className="admin-section-heading">
          <div>
            <p>Последние поступления</p>
            <h2 id="admin-recent-title">Заказы</h2>
          </div>
          <Link href="/admin/orders">Открыть весь список</Link>
        </div>
        <AdminOrderList orders={dashboard.recentOrders} compact />
      </section>
    </div>
  );
}
