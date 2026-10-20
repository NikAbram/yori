"use client";

import { Search, SlidersHorizontal, X } from "lucide-react";
import { useDeferredValue, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { categories, products } from "@/data/products";
import { ProductCard } from "@/components/miniapp/product-card";
import type { CategorySlug, Product } from "@/types/catalog";

type SortOrder = "manual" | "price-asc" | "price-desc";

function sortProducts(items: Product[], order: SortOrder) {
  if (order === "price-asc") return items.toSorted((a, b) => a.priceKopeks - b.priceKopeks);
  if (order === "price-desc") return items.toSorted((a, b) => b.priceKopeks - a.priceKopeks);
  return items.toSorted((a, b) => a.sortOrder - b.sortOrder);
}

export function CatalogExperience() {
  const searchParams = useSearchParams();
  const initialCategory = searchParams.get("category");
  const [category, setCategory] = useState<CategorySlug | "all">(categories.some((item) => item.slug === initialCategory) ? initialCategory as CategorySlug : "all");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortOrder>("manual");
  const deferredQuery = useDeferredValue(query.trim().toLocaleLowerCase("ru"));
  const visibleProducts = useMemo(() => sortProducts(products.filter((product) => {
    const matchesCategory = category === "all" || product.category === category;
    const matchesQuery = !deferredQuery || `${product.name} ${product.description}`.toLocaleLowerCase("ru").includes(deferredQuery);
    return matchesCategory && matchesQuery;
  }), sort), [category, deferredQuery, sort]);

  function resetFilters() { setCategory("all"); setQuery(""); setSort("manual"); }

  return (
    <div className="page-width">
      <div className="section-head" style={{ marginTop: 24 }}><h1 className="section-title display">Меню</h1><span className="muted">25 позиций</span></div>
      <div className="catalog-toolbar">
        <div className="catalog-controls">
          <div className="search-wrap"><Search size={20} aria-hidden="true" /><input className="search-input" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Поиск по меню" aria-label="Поиск по меню" />{query ? <button className="search-clear" type="button" onClick={() => setQuery("")} aria-label="Очистить поиск"><X size={19} /></button> : null}</div>
          <label><span className="visually-hidden">Сортировка</span><select className="sort-select" value={sort} onChange={(event) => setSort(event.target.value as SortOrder)}><option value="manual">Сначала рекомендуем</option><option value="price-asc">Сначала дешевле</option><option value="price-desc">Сначала дороже</option></select></label>
        </div>
        <div className="filter-row" aria-label="Категории"><button type="button" className="filter-button" data-active={category === "all"} aria-pressed={category === "all"} onClick={() => setCategory("all")}>Все</button>{categories.map((item) => <button type="button" className="filter-button" data-active={category === item.slug} aria-pressed={category === item.slug} onClick={() => setCategory(item.slug)} key={item.slug}>{item.shortName}</button>)}</div>
      </div>
      <p className="catalog-count">Найдено: {visibleProducts.length}</p>
      {visibleProducts.length ? <div className="product-grid">{visibleProducts.map((product, index) => <ProductCard product={product} key={product.id} priority={index < 4} />)}</div> : (
        <div className="empty-state"><SlidersHorizontal size={30} /><h2>Нет подходящих блюд</h2><p>Сбросьте фильтры или измените запрос — меню снова появится здесь.</p><button type="button" className="primary-button" onClick={resetFilters}>Сбросить фильтры</button></div>
      )}
    </div>
  );
}
