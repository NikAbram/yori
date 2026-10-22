"use client";

export default function AdminError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="admin-state" id="main-content">
      <span className="admin-state-mark" aria-hidden="true" />
      <h1>CRM временно недоступна</h1>
      <p>Не удалось загрузить защищённую рабочую область.</p>
      <button type="button" onClick={reset}>Повторить</button>
    </main>
  );
}
