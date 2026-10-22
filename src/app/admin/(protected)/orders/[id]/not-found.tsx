import Link from "next/link";

export default function AdminOrderNotFound() {
  return (
    <div className="admin-inline-error">
      <span aria-hidden="true" />
      <h1>Заказ не найден</h1>
      <p>Возможно, заказ удалён или ссылка устарела. Вернитесь в рабочую очередь.</p>
      <Link href="/admin/orders">К списку заказов</Link>
    </div>
  );
}
