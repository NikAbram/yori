"use client";

import Image from "next/image";
import Link from "next/link";
import { Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";
import { useMemo } from "react";
import { useCart } from "@/components/cart/cart-provider";
import { deliveryFor, formatMoney, type DeliveryPricing } from "@/lib/money";
import type { Product } from "@/types/catalog";

export function CartExperience({ products, pricing }: { products: Product[]; pricing: DeliveryPricing }) {
  const { lines, hydrated, setQuantity, removeItem, clear } = useCart();
  const productsById = useMemo(
    () => new Map(products.map((product) => [product.id, product])),
    [products],
  );
  const detailedLines = lines.flatMap((line) => {
    const product = productsById.get(line.productId);
    return product ? [{ ...line, product }] : [];
  });
  const subtotal = detailedLines.reduce((sum, line) => sum + line.product.priceKopeks * line.quantity, 0);
  const delivery = deliveryFor(subtotal, pricing);
  const total = subtotal + delivery;

  if (!hydrated) return <div className="page-width skeleton" style={{ minHeight: 450, borderRadius: 24 }} role="status" aria-live="polite" aria-busy="true"><span className="visually-hidden">Восстанавливаем корзину</span></div>;
  if (!detailedLines.length) return (
    <div className="page-width"><div className="empty-state"><ShoppingBag size={34} aria-hidden="true" /><h1 className="display">Корзина пока пустая</h1><p>Выберите любимые роллы — количество и состав заказа сохранятся в этом браузере.</p><Link href="/catalog" className="primary-button">Открыть меню</Link></div></div>
  );

  return (
    <div className="page-width">
      <div className="section-head" style={{ marginTop: 24 }}><h1 className="section-title display">Корзина</h1><span className="muted">{detailedLines.length} поз.</span></div>
      <div className="cart-actions"><button type="button" className="text-button" onClick={clear}><Trash2 size={16} aria-hidden="true" /> Очистить</button></div>
      <div className="cart-layout">
        <div className="cart-list">
          {detailedLines.map(({ product, quantity }) => (
            <article className="cart-line" key={product.id}>
              <Link href={`/product/${product.slug}`} className="cart-thumb" aria-label={`Открыть ${product.name}`}><Image src={product.image} alt="" fill sizes="112px" /></Link>
              <div><h2><Link href={`/product/${product.slug}`}>{product.name}</Link></h2><p>{formatMoney(product.priceKopeks)} · {product.weightGrams ? `${product.weightGrams} г` : `${product.volumeMl} мл`}</p><button type="button" className="remove-button" onClick={() => removeItem(product.id)}>Удалить</button></div>
              <div><strong>{formatMoney(product.priceKopeks * quantity)}</strong><div className="quantity" style={{ marginTop: 10 }}><button type="button" onClick={() => setQuantity(product.id, quantity - 1)} aria-label={`Уменьшить количество ${product.name}`}><Minus size={17} /></button><output>{quantity}</output><button type="button" onClick={() => setQuantity(product.id, quantity + 1)} aria-label={`Увеличить количество ${product.name}`}><Plus size={17} /></button></div></div>
            </article>
          ))}
        </div>
        <aside className="cart-summary" aria-label="Сумма заказа">
          <h2>Итого</h2>
          <div className="summary-row"><span>Блюда</span><strong>{formatMoney(subtotal)}</strong></div>
          <div className="summary-row"><span>Доставка</span><strong>{delivery ? formatMoney(delivery) : "Бесплатно"}</strong></div>
          <div className="summary-row summary-total"><span>К оплате</span><strong>{formatMoney(total)}</strong></div>
          <Link href="/checkout" className="primary-button">Перейти к оформлению</Link>
          <p style={{ color: "#bdb3a7", fontSize: 12, lineHeight: 1.45 }}>Финальная стоимость и наличие будут подтверждены перед оформлением.</p>
        </aside>
      </div>
    </div>
  );
}
