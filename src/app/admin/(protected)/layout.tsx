import Link from "next/link";

import { AdminSignOutButton } from "@/components/admin/admin-sign-out-button";
import { requireCurrentAdmin } from "@/services/admin-auth";

export default async function ProtectedAdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireCurrentAdmin();

  return (
    <div className="admin-shell">
      <a href="#admin-content" className="skip-link">К рабочей области</a>
      <header className="admin-header">
        <Link href="/admin" className="admin-wordmark" aria-label="YŌRI CRM — главная">
          YŌRI <span>CRM</span>
        </Link>
        <nav className="admin-nav" aria-label="Разделы CRM">
          <Link href="/admin">Сводка</Link>
          <Link href="/admin/orders">Заказы</Link>
          <Link href="/admin/catalog">Каталог</Link>
        </nav>
        <div className="admin-identity">
          <span>{admin.name}</span>
          <small>{admin.role === "OWNER" ? "Владелец" : "Менеджер"}</small>
          <AdminSignOutButton />
        </div>
      </header>
      <main className="admin-main" id="admin-content" tabIndex={-1}>{children}</main>
    </div>
  );
}
