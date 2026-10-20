"use client";

import Image from "next/image";
import Link from "next/link";
import { Plus } from "lucide-react";
import { useCart } from "@/components/cart/cart-provider";
import { impactTelegram } from "@/lib/telegram-client";
import { formatMoney } from "@/lib/money";
import type { Product } from "@/types/catalog";

function productSize(product: Product) {
  const parts = [product.piecesCount ? `${product.piecesCount} шт.` : null, product.weightGrams ? `${product.weightGrams} г` : null, product.volumeMl ? `${product.volumeMl} мл` : null];
  return parts.filter(Boolean).join(" · ");
}

export function ProductCard({ product, priority = false }: { product: Product; priority?: boolean }) {
  const { addItem } = useCart();
  return (
    <article className="product-card" data-testid="product-card">
      <Link href={`/product/${product.slug}`} className="product-image-link">
        {product.badge ? <span className="product-badge">{product.badge}</span> : null}
        <Image src={product.image} alt={product.imageAlt} fill sizes="(max-width: 620px) 50vw, (max-width: 900px) 50vw, 25vw" preload={priority} />
        {!product.isAvailable ? <span className="product-unavailable">Временно нет</span> : null}
      </Link>
      <div className="product-copy">
        <h3><Link href={`/product/${product.slug}`}>{product.name}</Link></h3>
        <p>{product.description}</p>
        <div className="product-meta"><span className="product-price">{formatMoney(product.priceKopeks)}</span><span className="product-size">{productSize(product)}</span></div>
      </div>
      <button type="button" className="quick-add" disabled={!product.isAvailable} onClick={() => { addItem(product.id, 1, product.priceKopeks); void impactTelegram(); }} aria-label={`Добавить ${product.name} в корзину`}>
        <Plus size={21} aria-hidden="true" />
      </button>
    </article>
  );
}
