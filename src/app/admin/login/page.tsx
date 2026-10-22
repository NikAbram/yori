import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AdminLoginForm } from "@/components/admin/admin-login-form";
import { getCurrentAdmin } from "@/services/admin-auth";

export const metadata: Metadata = { title: "Вход" };

export default async function AdminLoginPage() {
  if (await getCurrentAdmin()) redirect("/admin");

  return (
    <main className="admin-login" id="main-content">
      <section className="admin-login-panel" aria-labelledby="admin-login-title">
        <div className="admin-login-brand" aria-hidden="true">
          <span>YŌRI</span>
          <i />
        </div>
        <div className="admin-login-copy">
          <p>Закрытая рабочая зона</p>
          <h1 id="admin-login-title">Вход в CRM</h1>
          <span>Управление рестораном доступно только сотрудникам с активной учётной записью.</span>
        </div>
        <AdminLoginForm />
      </section>
      <p className="admin-login-footnote">YŌRI · служебный доступ</p>
    </main>
  );
}
