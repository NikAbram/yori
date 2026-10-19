import type { Metadata, Viewport } from "next";
import { CartProvider } from "@/components/cart/cart-provider";
import { AppShell } from "@/components/miniapp/app-shell";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "YŌRI — суши и роллы", template: "%s — YŌRI" },
  description: "Меню суши и роллов YŌRI",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f4efe6" },
    { media: "(prefers-color-scheme: dark)", color: "#171411" },
  ],
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ru" data-scroll-behavior="smooth">
      <body>
        <CartProvider>
          <AppShell>{children}</AppShell>
        </CartProvider>
      </body>
    </html>
  );
}
