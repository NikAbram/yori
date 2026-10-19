import type { Metadata } from "next";
import { CircleHelp } from "lucide-react";
import { InfoPage } from "@/components/miniapp/info-page";

export const metadata: Metadata = { title: "Помощь" };

const sections = [
  { title: "Выберите блюда", body: "Каталог, поиск и корзина работают и в обычном браузере. Недоступные позиции нельзя добавить в заказ." },
  { title: "Проверьте корзину", body: "Количество и состав сохраняются на этом устройстве. Перед оформлением цены и наличие будут проверены ещё раз." },
  { title: "Продолжите в Telegram", body: "Оформление, профиль и личная история требуют подтверждённого Telegram-аккаунта. Сейчас приём заказов закрыт." },
  { title: "Если раздел не открылся", body: "Вернитесь в каталог и повторите переход. Корзина при этом останется на устройстве." },
];

export default function HelpPage() {
  return <InfoPage icon={CircleHelp} kicker="Помощь" title="От выбора до заказа" intro="Короткий маршрут по YŌRI без скрытых действий и обещаний, которых сервис пока не может выполнить." sections={sections} />;
}
