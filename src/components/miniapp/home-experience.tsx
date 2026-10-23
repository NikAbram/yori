"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Search, X } from "lucide-react";
import { useState } from "react";
import { ProductCard } from "@/components/miniapp/product-card";
import type { PublicCatalog } from "@/types/catalog";

export function HomeExperience({ categories, products, brandName, brandDescription }: PublicCatalog & { brandName: string; brandDescription: string | null }) {
  const [query, setQuery] = useState("");
  const normalized = query.trim().toLocaleLowerCase("ru");
  const results = normalized ? products.filter((product) => product.name.toLocaleLowerCase("ru").includes(normalized)).slice(0, 4) : [];
  const featured = products.filter((product) => product.isFeatured).slice(0, 4);
  const recommended = products.filter((product) => product.isRecommended).slice(0, 4);

  return (
    <>
      <div className="page-width">
        <section className="hero" aria-labelledby="hero-title">
          <div className="hero-media"><Image src="/images/products/sushi-set.webp" alt="Большой сет свежих роллов" fill preload sizes="100vw" /></div>
          <div className="hero-copy">
            <p className="hero-kicker">{brandName}</p>
            <h1 id="hero-title" className="display">Вкус, который держит форму</h1>
            <p>{brandDescription ?? "Роллы, суши и тёплые блюда в точной, современной подаче."}</p>
            <div className="hero-actions">
              <Link className="primary-button" href="/catalog">Открыть меню <ArrowRight size={18} aria-hidden="true" /></Link>
              <Link className="secondary-button" href="/catalog?category=sets">Выбрать сет</Link>
            </div>
          </div>
        </section>
      </div>

      <section className="page-width section" aria-labelledby="category-title">
        <div className="section-head"><h2 id="category-title" className="section-title display">Что хочется сегодня</h2></div>
        <div className="category-strip">
          {categories.map((category) => (
            <Link className="category-chip" href={`/catalog?category=${category.slug}`} key={category.slug}>
              <small>{category.eyebrow}</small><strong>{category.name}</strong>
            </Link>
          ))}
        </div>
      </section>

      <section className="page-width" aria-labelledby="search-title">
        <h2 id="search-title" className="visually-hidden">Поиск по меню</h2>
        <div className="search-wrap">
          <Search size={20} aria-hidden="true" />
          <input className="search-input" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Найти ролл, суп или напиток" aria-label="Поиск по названию" />
          {query ? <button className="search-clear" type="button" onClick={() => setQuery("")} aria-label="Очистить поиск"><X size={19} /></button> : null}
        </div>
        {normalized ? (
          <div className="section" style={{ paddingBottom: 0 }}>
            <div className="section-head"><h2 className="section-title display">Результаты</h2><span className="muted">{results.length}</span></div>
            {results.length ? <div className="product-grid">{results.map((product, index) => <ProductCard key={product.id} product={product} priority={index < 2} />)}</div> : (
              <div className="empty-state"><Search size={28} aria-hidden="true" /><h2>Ничего не нашли</h2><p>Попробуйте другое название или откройте весь каталог.</p><Link href="/catalog" className="primary-button">Открыть каталог</Link></div>
            )}
          </div>
        ) : null}
      </section>

      {!normalized ? (
        <>
          <section className="page-width section" aria-labelledby="featured-title">
            <div className="section-head"><h2 id="featured-title" className="section-title display">В центре внимания</h2><Link className="section-link" href="/catalog">Всё меню</Link></div>
            <div className="product-grid">{featured.map((product, index) => <ProductCard key={product.id} product={product} priority={index < 2} />)}</div>
          </section>
          <section className="page-width section" aria-labelledby="recommended-title">
            <div className="section-head"><h2 id="recommended-title" className="section-title display">Советуем попробовать</h2></div>
            <div className="product-grid">{recommended.map((product) => <ProductCard key={product.id} product={product} />)}</div>
          </section>
        </>
      ) : null}
    </>
  );
}
