export default function AdminLoading() {
  return (
    <main className="admin-state" aria-live="polite" aria-busy="true">
      <span className="admin-state-mark" aria-hidden="true" />
      <p>Проверяем доступ к CRM…</p>
    </main>
  );
}
