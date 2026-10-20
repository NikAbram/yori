export default function OrdersLoading() {
  return (
    <div className="page-width account-page" role="status" aria-live="polite" aria-busy="true">
      <span className="visually-hidden">Загружаем заказы</span>
      <div className="skeleton skeleton-heading" aria-hidden="true" />
      <div className="orders-layout" aria-hidden="true">
        <div className="skeleton skeleton-panel" />
        <div className="skeleton skeleton-panel" />
      </div>
    </div>
  );
}
