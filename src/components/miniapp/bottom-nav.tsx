"use client";

import Link from "next/link";
import { BookOpen, Home, ReceiptText, ShoppingBag, UserRound } from "lucide-react";
import { usePathname } from "next/navigation";
import { useCart } from "@/components/cart/cart-provider";

export function BottomNav() {
  const pathname = usePathname();
  const { itemCount } = useCart();

  return (
    <nav className="bottom-nav" aria-label="Основная навигация">
      <Link href="/" className="nav-item" data-active={pathname === "/"}><Home size={20} aria-hidden="true" /><span>Главная</span></Link>
      <Link href="/catalog" className="nav-item" data-active={pathname === "/catalog" || pathname.startsWith("/product")}><BookOpen size={20} aria-hidden="true" /><span>Каталог</span></Link>
      <Link href="/cart" className="nav-item" data-active={pathname === "/cart" || pathname === "/checkout"}>
        <span className="cart-nav-icon"><ShoppingBag size={20} aria-hidden="true" />{itemCount > 0 ? <span className="cart-count">{itemCount}</span> : null}</span>
        <span>Корзина</span>
      </Link>
      <Link href="/orders" className="nav-item" data-active={pathname.startsWith("/orders")}><ReceiptText size={20} aria-hidden="true" /><span>Заказы</span></Link>
      <Link href="/profile" className="nav-item" data-active={pathname === "/profile"}><UserRound size={20} aria-hidden="true" /><span>Профиль</span></Link>
    </nav>
  );
}
