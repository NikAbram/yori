"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BottomNav } from "@/components/miniapp/bottom-nav";
import { TelegramBridge } from "@/components/miniapp/telegram-bridge";

export function AppShell({ children, brandName, isPublicOrderingOpen }: { children: React.ReactNode; brandName: string; isPublicOrderingOpen: boolean }) {
  const pathname = usePathname();

  if (pathname.startsWith("/admin")) return children;

  return (
    <div className="app-frame">
      <TelegramBridge />
      <a href="#main-content" className="skip-link">К основному содержанию</a>
      <header className="page-width topbar">
        <Link href="/" className="brand-mark" aria-label={`${brandName} — главная`}>
          {brandName} <span className="brand-dot" aria-hidden="true" />
        </Link>
        <span className="closed-pill" data-open={isPublicOrderingOpen}>{isPublicOrderingOpen ? "Приём заказов открыт" : "Приём заказов сейчас закрыт"}</span>
      </header>
      <main id="main-content" tabIndex={-1}>{children}</main>
      <BottomNav />
    </div>
  );
}
