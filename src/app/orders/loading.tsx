export default function OrdersLoading() {
  return (
    <div className="page-width account-page" aria-label="Загрузка заказов" aria-busy="true">
      <div className="skeleton skeleton-heading" />
      <div className="orders-layout">
        <div className="skeleton skeleton-panel" />
        <div className="skeleton skeleton-panel" />
      </div>
    </div>
  );
}
