import Image from "next/image";
import Link from "next/link";

type CategoryOverview = {
  id: string;
  name: string;
  shortName: string;
  slug: string;
  sortOrder: number;
  isPublished: boolean;
  _count: { products: number };
};

type ProductOverview = {
  id: string;
  name: string;
  slug: string;
  imagePath: string;
  imageAlt: string;
  priceKopeks: number;
  isAvailable: boolean;
  isPublished: boolean;
  isFeatured: boolean;
  isRecommended: boolean;
  sortOrder: number;
  category: { name: string; slug: string; isPublished: boolean };
};

function formatExactMoney(kopeks: number) {
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    minimumFractionDigits: kopeks % 100 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(kopeks / 100);
}

export function AdminCatalogOverview({
  categories,
  products,
}: {
  categories: CategoryOverview[];
  products: ProductOverview[];
}) {
  return (
    <div className="admin-catalog-layout">
      <aside className="admin-category-index" aria-labelledby="category-index-title">
        <div className="admin-catalog-subhead">
          <div><p>Структура меню</p><h2 id="category-index-title">Категории</h2></div>
          <Link href="/admin/catalog/categories/new">Добавить</Link>
        </div>
        {categories.length ? (
          <ol>
            {categories.map((category) => (
              <li key={category.id} data-published={category.isPublished}>
                <Link href={`/admin/catalog/categories/${category.id}`} aria-label={`Редактировать категорию ${category.name}`}>
                  <span><strong>{category.shortName}</strong><small>/{category.slug}</small></span>
                  <span><b>{category._count.products}</b><small>порядок {category.sortOrder}</small></span>
                </Link>
              </li>
            ))}
          </ol>
        ) : (
          <div className="admin-catalog-empty"><strong>Категорий нет</strong><p>Создайте первую категорию, затем добавьте в неё товары.</p></div>
        )}
      </aside>

      <section className="admin-product-ledger" aria-labelledby="product-ledger-title">
        <div className="admin-catalog-subhead">
          <div><p>Позиции меню</p><h2 id="product-ledger-title">Товары</h2></div>
          {categories.length ? <Link href="/admin/catalog/products/new">Добавить товар</Link> : <span>Сначала создайте категорию</span>}
        </div>
        {products.length ? (
          <ol>
            {products.map((product) => (
              <li key={product.id} data-muted={!product.isPublished || !product.category.isPublished}>
                <Link href={`/admin/catalog/products/${product.id}`} aria-label={`Редактировать товар ${product.name}`}>
                  <Image src={product.imagePath} alt={product.imageAlt} width={96} height={76} sizes="96px" />
                  <span className="admin-product-ledger-copy">
                    <strong>{product.name}</strong>
                    <small>{product.category.name} · /{product.slug}</small>
                    <span className="admin-product-flags">
                      <em data-active={product.isPublished}>{product.isPublished ? "Опубликован" : "Скрыт"}</em>
                      <em data-active={product.isAvailable}>{product.isAvailable ? "Доступен" : "Стоп-лист"}</em>
                      {product.isFeatured ? <em data-active="true">Главная</em> : null}
                      {product.isRecommended ? <em data-active="true">Рекомендуем</em> : null}
                    </span>
                  </span>
                  <span className="admin-product-ledger-meta">
                    <strong>{formatExactMoney(product.priceKopeks)}</strong>
                    <small>порядок {product.sortOrder}</small>
                  </span>
                </Link>
              </li>
            ))}
          </ol>
        ) : (
          <div className="admin-catalog-empty"><strong>Товаров нет</strong><p>Добавьте первую позицию после создания категории.</p></div>
        )}
      </section>
    </div>
  );
}
