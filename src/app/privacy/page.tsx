import type { Metadata } from "next";
import { FileLock2 } from "lucide-react";
import { InfoPage } from "@/components/miniapp/info-page";

export const metadata: Metadata = { title: "Как используются данные", robots: { index: false, follow: false } };

const sections = [
  { title: "Корзина", body: "Выбранные позиции и количество сохраняются локально в браузере на вашем устройстве. В корзине нет имени, телефона или адреса." },
  { title: "Telegram", body: "Имя, username и идентификатор можно использовать только после проверки подписи Telegram на сервере. Неподтверждённые данные не считаются входом в профиль." },
  { title: "Оформление", body: "Контактные данные и адрес будут запрашиваться только для заказа и после явного согласия на обработку данных." },
  { title: "Полные сведения", body: "Сведения об операторе, сроках хранения и контакте для обращений будут опубликованы до открытия приёма заказов." },
];

export default function PrivacyPage() {
  return <InfoPage icon={FileLock2} kicker="Приватность" title="Только необходимые данные" intro="YŌRI разделяет локальную корзину, подтверждённый Telegram-профиль и данные будущего заказа." sections={sections} />;
}
