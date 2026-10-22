import type { Metadata } from "next";

export const metadata: Metadata = {
  title: { default: "CRM", template: "%s — YŌRI CRM" },
  description: "Закрытая панель управления YŌRI",
  robots: { index: false, follow: false, nocache: true },
};

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return children;
}
