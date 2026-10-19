import type { Metadata } from "next";
import Link from "next/link";
import { LockKeyhole } from "lucide-react";

export const metadata: Metadata = { title: "Оформление", robots: { index: false, follow: false } };

export default function CheckoutPreviewPage() {
  return <div className="page-width"><section className="checkout-preview"><LockKeyhole size={34} aria-hidden="true" /><h1 className="display">Оформление откроется в Telegram</h1><p>Сейчас приём заказов закрыт. Корзина сохранена — к ней можно вернуться позже без потери выбранных позиций.</p><Link href="/cart" className="secondary-button">Вернуться в корзину</Link></section></div>;
}
