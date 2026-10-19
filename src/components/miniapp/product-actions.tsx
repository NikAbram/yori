"use client";

import { Minus, Plus, ShoppingBag } from "lucide-react";
import { useState } from "react";
import { useCart } from "@/components/cart/cart-provider";
import { formatMoney } from "@/lib/money";
import { impactTelegram, selectTelegram } from "@/lib/telegram-client";

export function ProductActions({ productId, productName, priceKopeks, available }: { productId: string; productName: string; priceKopeks: number; available: boolean }) {
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  const { addItem } = useCart();

  function addToCart() {
    addItem(productId, quantity, priceKopeks);
    void impactTelegram("medium");
    setAdded(true);
    window.setTimeout(() => setAdded(false), 1800);
  }

  return (
    <>
      <div className="product-buy">
        <div className="quantity" aria-label="Количество">
          <button type="button" onClick={() => { setQuantity((value) => Math.max(1, value - 1)); void selectTelegram(); }} aria-label="Уменьшить количество"><Minus size={18} /></button>
          <output aria-live="polite">{quantity}</output>
          <button type="button" onClick={() => { setQuantity((value) => Math.min(20, value + 1)); void selectTelegram(); }} aria-label="Увеличить количество"><Plus size={18} /></button>
        </div>
        <button type="button" className="primary-button" onClick={addToCart} disabled={!available}><ShoppingBag size={18} aria-hidden="true" />{available ? `Добавить · ${formatMoney(priceKopeks * quantity)}` : "Временно нет"}</button>
      </div>
      {added ? <div className="toast" role="status">{productName} добавлен в корзину</div> : null}
    </>
  );
}
