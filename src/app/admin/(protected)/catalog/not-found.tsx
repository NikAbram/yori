import Link from "next/link";

export default function AdminCatalogNotFound() {
  return (
    <div className="admin-inline-error">
      <span aria-hidden="true" />
      <h1>Запись не найдена</h1>
      <p>Возможно, категория или товар уже были удалены другим сотрудником.</p>
      <Link href="/admin/catalog">Вернуться в каталог</Link>
    </div>
  );
}
