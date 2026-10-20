import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { formatMoney } from "@/lib/money";
import { ProductActions } from "@/components/miniapp/product-actions";
import { getPublicProductBySlug, getPublishedProductSlugs } from "@/services/catalog";

type PageProps = { params: Promise<{ slug: string }> };

export const instant = false;

export async function generateStaticParams() {
  const slugs = await getPublishedProductSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const result = await getPublicProductBySlug((await params).slug);
  return result ? { title: result.product.name, description: result.product.description } : { title: "Товар не найден" };
}

export default async function ProductPage({ params }: PageProps) {
  const result = await getPublicProductBySlug((await params).slug);
  if (!result) notFound();
  const { product, categoryName } = result;
  return (
    <article className="page-width product-page">
      <div className="product-hero-image"><Image src={product.image} alt={product.imageAlt} fill preload sizes="(max-width: 900px) 100vw, 55vw" /></div>
      <div className="product-details">
        <Link href="/catalog" className="text-button"><ArrowLeft size={17} aria-hidden="true" /> Назад</Link>
        <p className="hero-kicker product-kicker">{categoryName}</p>
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
