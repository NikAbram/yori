export default function CheckoutLoading() {
  return (
    <div className="page-width skeleton skeleton-checkout" role="status" aria-live="polite" aria-busy="true">
      <span className="visually-hidden">Восстанавливаем корзину</span>
    </div>
  );
}
