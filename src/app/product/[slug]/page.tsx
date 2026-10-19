import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { products, getCategoryName, getProductBySlug } from "@/data/products";
import { formatMoney } from "@/lib/money";
import { ProductActions } from "@/components/miniapp/product-actions";

type PageProps = { params: Promise<{ slug: string }> };

export const instant = false;

export function generateStaticParams() {
  return products.map((product) => ({ slug: product.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const product = getProductBySlug((await params).slug);
  return product ? { title: product.name, description: product.description } : { title: "Товар не найден" };
}

export default async function ProductPage({ params }: PageProps) {
  const product = getProductBySlug((await params).slug);
  if (!product) notFound();
  return (
    <article className="page-width product-page">
      <div className="product-hero-image"><Image src={product.image} alt={product.imageAlt} fill preload sizes="(max-width: 900px) 100vw, 55vw" /></div>
      <div className="product-details">
        <Link href="/catalog" className="text-button"><ArrowLeft size={17} aria-hidden="true" /> Назад</Link>
        <p className="hero-kicker" style={{ color: "var(--tomato)", marginTop: 30 }}>{getCategoryName(product.category)}</p>
        <h1 className="display">{product.name}</h1>
        <p className="lead">{product.description}</p>
        <ul className="fact-list">
          {product.piecesCount ? <li>{product.piecesCount} шт.</li> : null}
          {product.weightGrams ? <li>{product.weightGrams} г</li> : null}
          {product.volumeMl ? <li>{product.volumeMl} мл</li> : null}
          <li>{formatMoney(product.priceKopeks)}</li>
        </ul>
        <div className="ingredients"><h2>Состав</h2><p>{product.ingredients.join(", ")}</p></div>
        {product.allergens.length ? <div className="ingredients"><h2>Аллергены</h2><p>{product.allergens.join(", ")}</p></div> : null}
        <ProductActions productId={product.id} productName={product.name} priceKopeks={product.priceKopeks} available={product.isAvailable} />
      </div>
    </article>
  );
}
