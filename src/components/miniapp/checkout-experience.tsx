"use client";

import Link from "next/link";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertTriangle, Check, Clock3, CreditCard, LockKeyhole, ShoppingBag } from "lucide-react";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { useCart } from "@/components/cart/cart-provider";
import { StatePanel } from "@/components/miniapp/state-panel";
import { checkoutSchema, type CheckoutFormInput, type CheckoutFormValues } from "@/lib/checkout-schema";
import { MIN_ORDER_KOPEKS, deliveryFor, formatMoney } from "@/lib/money";
import { notifyTelegram } from "@/lib/telegram-client";
import type { Product } from "@/types/catalog";

const defaultValues: CheckoutFormInput = {
  recipientName: "",
  phone: "",
  city: "",
  street: "",
  house: "",
  apartment: "",
  entrance: "",
  floor: "",
  comment: "",
  consent: false,
};

export function CheckoutExperience({ products }: { products: Product[] }) {
  const { lines, hydrated } = useCart();
  const [checked, setChecked] = useState(false);
  const productsById = useMemo(
    () => new Map(products.map((product) => [product.id, product])),
    [products],
  );
  const { register, handleSubmit, formState: { errors } } = useForm<CheckoutFormInput, unknown, CheckoutFormValues>({
    resolver: zodResolver(checkoutSchema),
    defaultValues,
    mode: "onBlur",
  });

  const detailedLines = lines.flatMap((line) => {
    const product = productsById.get(line.productId);
    return product ? [{ ...line, product }] : [];
  });
  const missingCount = lines.length - detailedLines.length;
  const unavailableLines = detailedLines.filter((line) => !line.product.isAvailable);
  const changedPriceLines = detailedLines.filter((line) => line.priceKopeksSnapshot !== undefined && line.priceKopeksSnapshot !== line.product.priceKopeks);
  const subtotal = detailedLines.reduce((sum, line) => sum + line.product.priceKopeks * line.quantity, 0);
  const delivery = deliveryFor(subtotal);
  const total = subtotal + delivery;
  const minimumRemaining = Math.max(0, MIN_ORDER_KOPEKS - subtotal);
  const cartBlocked = missingCount > 0 || unavailableLines.length > 0 || minimumRemaining > 0;

  function onValid() {
    setChecked(true);
    void notifyTelegram("success");
    window.requestAnimationFrame(() => document.getElementById("checkout-checked")?.focus());
  }

  if (!hydrated) return <div className="page-width skeleton skeleton-checkout" role="status" aria-live="polite" aria-busy="true"><span className="visually-hidden">Восстанавливаем корзину</span></div>;
  if (!detailedLines.length) return (
    <div className="page-width route-state-wrap">
      <StatePanel icon={ShoppingBag} title="Сначала соберите корзину" description="Добавьте блюда, чтобы проверить адрес, контактные данные и итог будущего заказа." action={{ href: "/catalog", label: "Открыть меню" }} />
    </div>
  );

  return (
    <div className="page-width checkout-page">
      <header className="checkout-heading">
        <p className="hero-kicker">Оформление</p>
        <h1 className="display">Куда привезти заказ</h1>
        <p>Заполните данные и проверьте итог. Сейчас форма ничего не отправляет: приём заказов закрыт.</p>
      </header>

      <div className="checkout-closed" role="status">
        <LockKeyhole size={22} aria-hidden="true" />
        <div><strong>Приём заказов сейчас закрыт</strong><span>После проверки формы заказ не будет создан, а данные не покинут это устройство.</span></div>
      </div>

      {(missingCount > 0 || unavailableLines.length > 0 || changedPriceLines.length > 0) ? (
        <section className="cart-sync-notice" aria-labelledby="cart-sync-title">
          <AlertTriangle size={23} aria-hidden="true" />
          <div>
            <h2 id="cart-sync-title">Корзина изменилась</h2>
            {missingCount > 0 ? <p>{missingCount} поз. больше нет в каталоге. Удалите её в корзине.</p> : null}
            {unavailableLines.length > 0 ? <p>Недоступно: {unavailableLines.map((line) => line.product.name).join(", ")}.</p> : null}
            {changedPriceLines.length > 0 ? <p>Цены обновлены для {changedPriceLines.length} поз. Итог рассчитан по текущему меню.</p> : null}
            <Link href="/cart" className="text-button">Проверить корзину</Link>
          </div>
        </section>
      ) : null}

      <div className="checkout-layout">
        <form className="checkout-form" noValidate onSubmit={handleSubmit(onValid)} onChangeCapture={() => { if (checked) setChecked(false); }}>
          <fieldset>
            <legend className="display">Получатель</legend>
            <div className="form-grid">
              <label className="form-field">
                <span>Имя</span>
                <input autoComplete="name" aria-invalid={Boolean(errors.recipientName)} aria-describedby={errors.recipientName ? "recipient-error" : undefined} {...register("recipientName")} />
                {errors.recipientName ? <small id="recipient-error" role="alert">{errors.recipientName.message}</small> : null}
              </label>
              <label className="form-field">
                <span>Телефон</span>
                <input type="tel" inputMode="tel" autoComplete="tel" placeholder="+7 927 000-00-00" aria-invalid={Boolean(errors.phone)} aria-describedby={errors.phone ? "phone-error" : undefined} {...register("phone")} />
                {errors.phone ? <small id="phone-error" role="alert">{errors.phone.message}</small> : null}
              </label>
            </div>
          </fieldset>

          <fieldset>
            <legend className="display">Адрес</legend>
            <p className="fieldset-note">Зона доставки будет подтверждена перед открытием заказов.</p>
            <div className="form-grid">
              <label className="form-field form-field-wide">
                <span>Город</span>
                <input autoComplete="address-level2" aria-invalid={Boolean(errors.city)} aria-describedby={errors.city ? "city-error" : undefined} {...register("city")} />
                {errors.city ? <small id="city-error" role="alert">{errors.city.message}</small> : null}
              </label>
              <label className="form-field form-field-wide">
                <span>Улица</span>
                <input autoComplete="address-line1" aria-invalid={Boolean(errors.street)} aria-describedby={errors.street ? "street-error" : undefined} {...register("street")} />
                {errors.street ? <small id="street-error" role="alert">{errors.street.message}</small> : null}
              </label>
              <label className="form-field">
                <span>Дом</span>
                <input aria-invalid={Boolean(errors.house)} aria-describedby={errors.house ? "house-error" : undefined} {...register("house")} />
                {errors.house ? <small id="house-error" role="alert">{errors.house.message}</small> : null}
              </label>
              <label className="form-field"><span>Квартира / офис</span><input autoComplete="address-line2" {...register("apartment")} /></label>
              <label className="form-field"><span>Подъезд</span><input inputMode="numeric" {...register("entrance")} /></label>
              <label className="form-field"><span>Этаж</span><input inputMode="numeric" {...register("floor")} /></label>
              <label className="form-field form-field-wide">
                <span>Комментарий</span>
                <textarea rows={4} placeholder="Код домофона, ориентир или пожелание" aria-invalid={Boolean(errors.comment)} aria-describedby={errors.comment ? "comment-error" : undefined} {...register("comment")} />
                {errors.comment ? <small id="comment-error" role="alert">{errors.comment.message}</small> : null}
              </label>
            </div>
          </fieldset>

          <fieldset>
            <legend className="display">Условия</legend>
            <div className="checkout-option"><Clock3 size={22} aria-hidden="true" /><span><strong>Как можно скорее</strong><small>Без обещания точного времени</small></span></div>
            <div className="checkout-option" data-disabled="true"><CreditCard size={22} aria-hidden="true" /><span><strong>Способ оплаты пока недоступен</strong><small>Он появится только после подключения реального способа оплаты</small></span></div>
            <label className="consent-field">
              <input type="checkbox" aria-invalid={Boolean(errors.consent)} aria-describedby={errors.consent ? "consent-error" : undefined} {...register("consent")} />
              <span>Я согласен на обработку данных для оформления заказа и ознакомился со страницей <Link href="/privacy">«Как используются данные»</Link>.</span>
            </label>
            {errors.consent ? <small className="field-error" id="consent-error" role="alert">{errors.consent.message}</small> : null}
          </fieldset>

          {minimumRemaining > 0 ? <p className="minimum-note">До минимальной суммы не хватает {formatMoney(minimumRemaining)}.</p> : null}
          <button className="primary-button checkout-submit" type="submit" disabled={cartBlocked}>Проверить данные</button>
          {checked ? (
            <div className="checkout-checked" id="checkout-checked" tabIndex={-1} role="status">
              <Check size={22} aria-hidden="true" />
              <div><strong>Данные заполнены</strong><span>Заказ не создан: приём заказов закрыт. Форма готова к будущему серверному подключению.</span></div>
            </div>
          ) : null}
        </form>

        <aside className="checkout-receipt" aria-label="Состав и сумма">
          <div className="receipt-top"><span>Ваш заказ</span><ShoppingBag size={19} aria-hidden="true" /></div>
          <ul>
            {detailedLines.map((line) => (
              <li key={line.product.id}><span><strong>{line.quantity} ×</strong> {line.product.name}</span><span>{formatMoney(line.product.priceKopeks * line.quantity)}</span></li>
            ))}
          </ul>
          <dl>
            <div><dt>Блюда</dt><dd>{formatMoney(subtotal)}</dd></div>
            <div><dt>Доставка</dt><dd>{delivery ? formatMoney(delivery) : "Бесплатно"}</dd></div>
            <div className="receipt-total"><dt>Итого</dt><dd>{formatMoney(total)}</dd></div>
          </dl>
          <Link href="/cart" className="receipt-link">Изменить корзину</Link>
        </aside>
      </div>
    </div>
  );
}
