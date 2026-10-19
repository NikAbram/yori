import Link from "next/link";
import { BottomNav } from "@/components/miniapp/bottom-nav";
import { TelegramBridge } from "@/components/miniapp/telegram-bridge";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="app-frame">
      <TelegramBridge />
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
