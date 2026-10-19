import Link from "next/link";
import { BottomNav } from "@/components/miniapp/bottom-nav";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="app-frame">
      <header className="page-width topbar">
        <Link href="/" className="brand-mark" aria-label="YŌRI — главная">
          YŌRI <span className="brand-dot" aria-hidden="true" />
        </Link>
        <span className="closed-pill">Приём заказов сейчас закрыт</span>
      </header>
      <main>{children}</main>
      <BottomNav />
    </div>
  );
}
