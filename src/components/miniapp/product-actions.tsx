"use client";

import { Minus, Plus, ShoppingBag } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useCart } from "@/components/cart/cart-provider";
import { formatMoney } from "@/lib/money";

type TelegramBackButton = { show?: () => void; hide?: () => void; onClick?: (callback: () => void) => void; offClick?: (callback: () => void) => void };

function getTelegramBackButton(): TelegramBackButton | undefined {
  return (window as typeof window & { Telegram?: { WebApp?: { BackButton?: TelegramBackButton } } }).Telegram?.WebApp?.BackButton;
}

export function ProductActions({ productId, productName, priceKopeks, available }: { productId: string; productName: string; priceKopeks: number; available: boolean }) {
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  const { addItem } = useCart();
  const router = useRouter();

  useEffect(() => {
    const backButton = getTelegramBackButton();
    const goBack = () => router.back();
    backButton?.show?.();
    backButton?.onClick?.(goBack);
    return () => { backButton?.offClick?.(goBack); backButton?.hide?.(); };
  }, [router]);

  function addToCart() {
    addItem(productId, quantity);
    setAdded(true);
    window.setTimeout(() => setAdded(false), 1800);
  }

  return (
    <>
      <div className="product-buy">
        <div className="quantity" aria-label="Количество">
          <button type="button" onClick={() => setQuantity((value) => Math.max(1, value - 1))} aria-label="Уменьшить количество"><Minus size={18} /></button>
          <output aria-live="polite">{quantity}</output>
          <button type="button" onClick={() => setQuantity((value) => Math.min(20, value + 1))} aria-label="Увеличить количество"><Plus size={18} /></button>
        </div>
        <button type="button" className="primary-button" onClick={addToCart} disabled={!available}><ShoppingBag size={18} aria-hidden="true" />{available ? `Добавить · ${formatMoney(priceKopeks * quantity)}` : "Временно нет"}</button>
      </div>
      {added ? <div className="toast" role="status">{productName} добавлен в корзину</div> : null}
    </>
  );
}
