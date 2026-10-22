"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BottomNav } from "@/components/miniapp/bottom-nav";
import { TelegramBridge } from "@/components/miniapp/telegram-bridge";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  if (pathname.startsWith("/admin")) return children;

  return (
    <div className="app-frame">
      <TelegramBridge />
      <a href="#main-content" className="skip-link">К основному содержанию</a>
      <header className="page-width topbar">
        <Link href="/" className="brand-mark" aria-label="YŌRI — главная">
          YŌRI <span className="brand-dot" aria-hidden="true" />
        </Link>
        <span className="closed-pill">Приём заказов сейчас закрыт</span>
      </header>
      <main id="main-content" tabIndex={-1}>{children}</main>
      <BottomNav />
    </div>
  );
}
