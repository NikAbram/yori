import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, CircleHelp, FileLock2, LockKeyhole, MapPin, Truck, UserRound } from "lucide-react";

export const metadata: Metadata = {
  title: "Профиль",
  robots: { index: false, follow: false },
};

const profileLinks = [
  { href: "/delivery", label: "Доставка", description: "Актуальная доступность и условия", icon: Truck },
  { href: "/help", label: "Помощь", description: "Как выбрать блюда и оформить заказ", icon: CircleHelp },
  { href: "/privacy", label: "Как используются данные", description: "Корзина, Telegram и согласие", icon: FileLock2 },
];

export default function ProfilePage() {
  return (
    <div className="page-width account-page">
      <header className="account-heading profile-heading">
        <span className="profile-avatar" aria-hidden="true"><UserRound size={34} /></span>
        <div>
          <p className="hero-kicker">Личный раздел</p>
          <h1 className="display">Профиль</h1>
          <p>Имя и username появятся только после серверной проверки Telegram.</p>
        </div>
      </header>

      <div className="profile-layout">
        <section className="profile-access" aria-labelledby="profile-access-title">
          <LockKeyhole size={28} strokeWidth={1.7} aria-hidden="true" />
          <div>
            <h2 id="profile-access-title">Откройте YŌRI в Telegram</h2>
            <p>Так мы сможем подтвердить аккаунт и показать только ваши данные. В браузере профиль остаётся закрытым.</p>
          </div>
        </section>

        <section className="saved-addresses" aria-labelledby="address-title">
          <div className="address-mark"><MapPin size={22} aria-hidden="true" /></div>
          <div><h2 id="address-title">Сохранённые адреса</h2><p>Адресов пока нет. Они будут сохраняться только по вашему явному согласию.</p></div>
        </section>

        <nav className="profile-links" aria-label="Информация и помощь">
          {profileLinks.map(({ href, label, description, icon: Icon }) => (
            <Link href={href} key={href}>
              <span className="profile-link-icon"><Icon size={21} aria-hidden="true" /></span>
              <span><strong>{label}</strong><small>{description}</small></span>
              <ChevronRight size={19} aria-hidden="true" />
            </Link>
          ))}
        </nav>
      </div>
    </div>
  );
}
