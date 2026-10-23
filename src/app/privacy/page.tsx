import type { Metadata } from "next";
import { FileLock2 } from "lucide-react";
import { InfoPage } from "@/components/miniapp/info-page";
import { getPublicSiteSettings } from "@/services/settings";

export const metadata: Metadata = { title: "Как используются данные", robots: { index: false, follow: false } };

export default async function PrivacyPage() {
  const settings = await getPublicSiteSettings();
  const sections = [
    { title: "Корзина", body: "Выбранные позиции и количество сохраняются локально в браузере на вашем устройстве. В корзине нет имени, телефона или адреса." },
    { title: "Telegram", body: "Имя, username и идентификатор можно использовать только после проверки подписи Telegram на сервере. Неподтверждённые данные не считаются входом в профиль." },
    { title: "Оформление", body: "Контактные данные и адрес запрашиваются только для заказа и после явного согласия на обработку данных." },
    { title: "Полные сведения", body: settings.privacyText ?? "Сведения об операторе, сроках хранения и контакте для обращений будут опубликованы до открытия приёма заказов." },
  ];
  return <InfoPage icon={FileLock2} kicker="Приватность" title="Только необходимые данные" intro="YŌRI разделяет локальную корзину, подтверждённый Telegram-профиль и данные будущего заказа." sections={sections} />;
}
