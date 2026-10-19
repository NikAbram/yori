"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BottomNav } from "@/components/miniapp/bottom-nav";

export function AppShell({ children }: { children: React.ReactNode }) {
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!message) return;
    const timeout = window.setTimeout(() => setMessage(null), 2600);
    return () => window.clearTimeout(timeout);
  }, [message]);

  return (
    <div className="app-frame">
      <header className="page-width topbar">
        <Link href="/" className="brand-mark" aria-label="YŌRI — главная">
          YŌRI <span className="brand-dot" aria-hidden="true" />
        </Link>
        <span className="closed-pill">Приём заказов сейчас закрыт</span>
      </header>
      <main>{children}</main>
      <BottomNav onUnavailable={() => setMessage("Этот раздел откроется после подключения Telegram")} />
      {message ? <div className="toast" role="status">{message}</div> : null}
    </div>
  );
}
