import type { Metadata } from "next";

export const metadata: Metadata = { title: "Рабочая область" };

export default function AdminHomePage() {
  return (
    <section className="admin-intro" aria-labelledby="admin-intro-title">
      <p>Система доступа готова</p>
      <h1 id="admin-intro-title">Рабочая область YŌRI</h1>
      <div className="admin-intro-line" />
      <p className="admin-intro-note">
        Заказы и показатели появятся здесь в следующей части. Сейчас защищённый контур CRM
        подтверждает активную серверную сессию и роль сотрудника.
      </p>
    </section>
  );
}
