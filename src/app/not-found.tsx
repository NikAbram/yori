import Link from "next/link";
import { SearchX } from "lucide-react";

export default function NotFound() {
  return <div className="page-width"><div className="empty-state"><SearchX size={34} aria-hidden="true" /><h1 className="display">Такого блюда нет</h1><p>Возможно, меню изменилось. Вернитесь в каталог и выберите другую позицию.</p><Link href="/catalog" className="primary-button">В каталог</Link></div></div>;
}
