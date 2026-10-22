"use client";

export default function ProtectedAdminError({ retry }: { error: unknown; retry: () => void }) {
  return (
    <section className="admin-inline-error" role="alert">
      <span aria-hidden="true" />
      <h1>Данные CRM не загрузились</h1>
      <p>Проверьте соединение и повторите запрос. Заказы в базе не изменены.</p>
      <button type="button" onClick={retry}>Повторить</button>
    </section>
  );
}
