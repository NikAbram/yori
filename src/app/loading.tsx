export default function Loading() {
  return (
    <div className="page-width" role="status" aria-live="polite" aria-busy="true">
      <span className="visually-hidden">Загружаем раздел</span>
      <div className="skeleton" style={{ minHeight: 520, borderRadius: 24 }} aria-hidden="true" />
    </div>
  );
}
