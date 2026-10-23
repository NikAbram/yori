"use client";

import { Check, CircleAlert, LockKeyhole } from "lucide-react";
import { startTransition, useActionState } from "react";
import { useForm } from "react-hook-form";

import {
  saveSettingsAction,
  type AdminSettingsActionState,
} from "@/app/admin/(protected)/settings/actions";
import type { AdminSettingsInput } from "@/lib/admin-settings-schema";
import type { ReadinessCheck } from "@/services/settings";

const initialActionState: AdminSettingsActionState = { status: "idle", message: "" };

function FieldError({ client, server }: { client?: string; server?: string[] }) {
  const message = client ?? server?.[0];
  return message ? <small className="admin-field-error">{message}</small> : null;
}

export function AdminSettingsForm({
  defaults,
  expectedUpdatedAt,
  canConfirmLive,
  orderMode,
  readiness,
  liveReadyAt,
  updatedBy,
}: {
  defaults: AdminSettingsInput;
  expectedUpdatedAt: string | null;
  canConfirmLive: boolean;
  orderMode: { value: "private_test" | "live" | "invalid"; label: string };
  readiness: ReadinessCheck[];
  liveReadyAt: string | null;
  updatedBy: string | null;
}) {
  const [state, action, pending] = useActionState(saveSettingsAction, initialActionState);
  const { register, handleSubmit, formState: { errors } } = useForm<AdminSettingsInput>({ defaultValues: defaults });
  const readinessComplete = readiness.every((item) => item.complete);

  return (
    <div className="admin-settings-layout">
      <form
        className="admin-editor-form admin-settings-form"
        onSubmit={handleSubmit((data) => startTransition(() => action({ expectedUpdatedAt, data })))}
      >
        <fieldset disabled={pending}>
          <legend>Бренд</legend>
          <div className="admin-editor-grid">
            <label className="admin-editor-field">
              <span>Название</span>
              <input {...register("brandName", { required: "Укажите название бренда." })} maxLength={80} autoFocus />
              <FieldError client={errors.brandName?.message} server={state.fieldErrors?.brandName} />
            </label>
            <label className="admin-editor-field admin-editor-wide">
              <span>Короткое описание</span>
              <textarea {...register("brandDescription")} rows={3} maxLength={500} placeholder="Появится на главной странице" />
              <FieldError client={errors.brandDescription?.message} server={state.fieldErrors?.brandDescription} />
            </label>
          </div>
        </fieldset>

        <fieldset disabled={pending}>
          <legend>Доставка</legend>
          <div className="admin-editor-grid admin-measure-grid">
            <label className="admin-editor-field">
              <span>Минимальный заказ, ₽</span>
              <input {...register("minimumOrderRubles", { required: "Укажите минимальную сумму." })} inputMode="decimal" placeholder="700" />
              <FieldError client={errors.minimumOrderRubles?.message} server={state.fieldErrors?.minimumOrderRubles} />
            </label>
            <label className="admin-editor-field">
              <span>Доставка, ₽</span>
              <input {...register("deliveryRubles", { required: "Укажите стоимость доставки." })} inputMode="decimal" placeholder="199" />
              <FieldError client={errors.deliveryRubles?.message} server={state.fieldErrors?.deliveryRubles} />
            </label>
            <label className="admin-editor-field">
              <span>Бесплатно от, ₽</span>
              <input {...register("freeDeliveryFromRubles")} inputMode="decimal" placeholder="Оставьте пустым, чтобы отключить" />
              <FieldError client={errors.freeDeliveryFromRubles?.message} server={state.fieldErrors?.freeDeliveryFromRubles} />
            </label>
            <label className="admin-editor-field admin-editor-wide">
              <span>Зоны и условия доставки</span>
              <textarea {...register("deliveryTerms")} rows={7} maxLength={4_000} placeholder="Только подтверждённые города, районы и условия" />
              <FieldError client={errors.deliveryTerms?.message} server={state.fieldErrors?.deliveryTerms} />
            </label>
          </div>
        </fieldset>

        <fieldset disabled={pending}>
          <legend>Приём и оплата</legend>
          <p className="admin-editor-hint">Эти флаги управляют доступностью checkout, но не меняют инфраструктурный ORDER_MODE.</p>
          <div className="admin-switch-grid">
            <label className="admin-editor-switch"><input type="checkbox" {...register("isOrderingEnabled")} /><span><strong>Разрешить приём заказов</strong><small>В private_test доступ останется только у allowlist.</small></span></label>
            <label className="admin-editor-switch"><input type="checkbox" {...register("cashOnDeliveryEnabled")} /><span><strong>Наличные при получении</strong><small>Показывать только если этот способ реально доступен.</small></span></label>
            <label className="admin-editor-switch"><input type="checkbox" {...register("cardOnDeliveryEnabled")} /><span><strong>Карта при получении</strong><small>Требует действующего терминала у курьера.</small></span></label>
          </div>
          <FieldError server={state.fieldErrors?.cashOnDeliveryEnabled} />
        </fieldset>

        <fieldset disabled={pending}>
          <legend>Контакты и сведения</legend>
          <div className="admin-editor-grid">
            <label className="admin-editor-field">
              <span>Действующий оператор</span>
              <input {...register("operatorName")} maxLength={160} placeholder="Только достоверное наименование" />
              <FieldError client={errors.operatorName?.message} server={state.fieldErrors?.operatorName} />
            </label>
            <label className="admin-editor-field">
              <span>Telegram chat ID менеджера</span>
              <input {...register("managerTelegramChatId")} maxLength={32} inputMode="numeric" autoComplete="off" placeholder="Например, -1001234567890" />
              <FieldError client={errors.managerTelegramChatId?.message} server={state.fieldErrors?.managerTelegramChatId} />
            </label>
            <label className="admin-editor-field admin-editor-wide">
              <span>Контактные данные</span>
              <textarea {...register("contactText")} rows={5} maxLength={2_000} placeholder="Телефон, Telegram или другой действующий канал связи" />
              <FieldError client={errors.contactText?.message} server={state.fieldErrors?.contactText} />
            </label>
            <label className="admin-editor-field admin-editor-wide">
              <span>Обработка персональных данных</span>
              <textarea {...register("privacyText")} rows={8} maxLength={6_000} placeholder="Оператор, цели обработки, сроки хранения и контакт для обращений" />
              <FieldError client={errors.privacyText?.message} server={state.fieldErrors?.privacyText} />
            </label>
          </div>
        </fieldset>

        <fieldset disabled={pending}>
          <legend>Подтверждение готовности</legend>
          <div className="admin-readiness-controls">
            {canConfirmLive ? (
              <>
                <label className="admin-editor-switch">
                  <input type="checkbox" {...register("commercialHostingConfirmed")} />
                  <span><strong>Хостинг разрешает коммерческую работу</strong><small>Vercel Hobby для реальных заказов не подходит.</small></span>
                </label>
                <label className="admin-editor-switch">
                  <input type="checkbox" {...register("liveReadinessConfirmed")} />
                  <span><strong>Владелец подтверждает операционную готовность</strong><small>Сервер примет подтверждение только после заполнения всего реестра справа.</small></span>
                </label>
              </>
            ) : (
              <div className="admin-owner-lock">
                <LockKeyhole size={22} aria-hidden="true" />
                <div><strong>Подтверждение доступно владельцу</strong><span>Менеджер может редактировать условия, но не подтверждать хостинг и готовность.</span></div>
                <input type="checkbox" hidden aria-hidden="true" tabIndex={-1} {...register("commercialHostingConfirmed")} />
                <input type="checkbox" hidden aria-hidden="true" tabIndex={-1} {...register("liveReadinessConfirmed")} />
              </div>
            )}
          </div>
        </fieldset>

        {state.message ? <p className="admin-catalog-action-error" role="alert">{state.message}</p> : null}
        <div className="admin-editor-actions">
          <button type="submit" disabled={pending}>{pending ? "Сохраняем…" : "Сохранить настройки"}</button>
          <span>Изменение будет записано в аудит.</span>
        </div>
      </form>

      <aside className="admin-readiness-rail" aria-labelledby="readiness-title">
        <div className="admin-readiness-head">
          <span>{readiness.filter((item) => item.complete).length}/{readiness.length}</span>
          <div><p>Readiness gate</p><h2 id="readiness-title">Готовность к live</h2></div>
        </div>
        <ol>
          {readiness.map((item) => (
            <li key={item.key} data-complete={item.complete}>
              <span>{item.complete ? <Check size={15} aria-hidden="true" /> : <CircleAlert size={15} aria-hidden="true" />}</span>
              <div><strong>{item.label}</strong><small>{item.detail}</small></div>
            </li>
          ))}
        </ol>
        <div className="admin-readiness-result" data-complete={readinessComplete && Boolean(liveReadyAt)}>
          <strong>{readinessComplete && liveReadyAt ? "Готовность подтверждена" : "Переход закрыт"}</strong>
          <p>{orderMode.value === "live" ? "Даже в live сервер проверяет этот реестр перед каждым заказом." : "CRM не может изменить ORDER_MODE. После готовности режим меняется только в окружении сервера."}</p>
          {liveReadyAt ? <small>Подтверждено {new Intl.DateTimeFormat("ru-RU", { dateStyle: "medium", timeStyle: "short" }).format(new Date(liveReadyAt))}</small> : null}
          {updatedBy ? <small>Последняя правка: {updatedBy}</small> : null}
        </div>
      </aside>
    </div>
  );
}
