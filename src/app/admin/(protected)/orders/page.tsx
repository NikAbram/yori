import type { Metadata } from "next";
import Link from "next/link";

import { AdminOrderList } from "@/components/admin/admin-order-list";
import { orderStatusLabels } from "@/data/orders";
import { ADMIN_ORDER_STATUSES, parseAdminOrderFilters } from "@/lib/admin-orders-schema";
import { listAdminOrders } from "@/services/admin-orders";

export const metadata: Metadata = { title: "Заказы" };

export const instant = false;

function pageHref(filters: ReturnType<typeof parseAdminOrderFilters>, page: number) {
  const params = new URLSearchParams();
  if (filters.q) params.set("q", filters.q);
  if (filters.status) params.set("status", filters.status);
  if (filters.from) params.set("from", filters.from);
  if (filters.to) params.set("to", filters.to);
  params.set("page", String(page));
  return `/admin/orders?${params.toString()}`;
}

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const filters = parseAdminOrderFilters(await searchParams);
  const result = await listAdminOrders(filters);
  const hasFilters = Boolean(filters.q || filters.status || filters.from || filters.to);

  return (
    <div className="admin-workspace">
      <section className="admin-orders-title" aria-labelledby="admin-orders-title">
        <div>
          <p>Рабочая очередь</p>
          <h1 id="admin-orders-title">Все заказы</h1>
        </div>
        <strong>{result.totalCount}</strong>
      </section>

      <form className="admin-order-filters" method="get" role="search">
        <label className="admin-filter-search">
          <span>Номер или телефон</span>
          <input name="q" type="search" defaultValue={filters.q} maxLength={64} placeholder="Например, YR-1042" />
        </label>
        <label>
          <span>Статус</span>
          <select name="status" defaultValue={filters.status ?? "ALL"}>
            <option value="ALL">Все статусы</option>
            {ADMIN_ORDER_STATUSES.map((status) => (
              <option value={status} key={status}>{orderStatusLabels[status]}</option>
            ))}
          </select>
        </label>
        <label>
          <span>С даты</span>
          <input name="from" type="date" defaultValue={filters.from} />
        </label>
        <label>
          <span>По дату</span>
          <input name="to" type="date" defaultValue={filters.to} />
        </label>
        <button type="submit">Применить</button>
        {hasFilters ? <Link href="/admin/orders">Сбросить</Link> : null}
      </form>

      <p className="admin-results-note" role="status">
        {result.totalCount === 0 ? "Совпадений нет" : `Найдено заказов: ${result.totalCount}`}
      </p>
      <AdminOrderList orders={result.orders} />

      {result.pageCount > 1 ? (
        <nav className="admin-pagination" aria-label="Страницы заказов">
          {result.page > 1 ? <Link href={pageHref(filters, result.page - 1)}>Назад</Link> : <span />}
          <span>Страница {result.page} из {result.pageCount}</span>
          {result.page < result.pageCount ? <Link href={pageHref(filters, result.page + 1)}>Далее</Link> : <span />}
        </nav>
      ) : null}
    </div>
  );
}
