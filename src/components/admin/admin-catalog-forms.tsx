"use client";

import Image from "next/image";
import { startTransition, useActionState } from "react";
import { useForm, useWatch } from "react-hook-form";

import {
  deleteCategoryAction,
  deleteProductAction,
  saveCategoryAction,
  saveProductAction,
  type AdminCatalogActionState,
} from "@/app/admin/(protected)/catalog/actions";
import { PRODUCT_IMAGE_OPTIONS } from "@/data/product-images";
import type { AdminCategoryInput, AdminProductInput } from "@/lib/admin-catalog-schema";

const initialActionState: AdminCatalogActionState = { status: "idle", message: "" };

function FieldError({ client, server }: { client?: string; server?: string[] }) {
  const message = client ?? server?.[0];
  return message ? <small className="admin-field-error">{message}</small> : null;
}

function ActionError({ state }: { state: AdminCatalogActionState }) {
  return state.message ? <p className="admin-catalog-action-error" role="alert">{state.message}</p> : null;
}

export function AdminCategoryForm({
  entityId,
  defaults,
  productCount,
}: {
  entityId: string | null;
  defaults: AdminCategoryInput;
  productCount?: number;
}) {
  const [state, action, pending] = useActionState(saveCategoryAction, initialActionState);
  const { register, handleSubmit, formState: { errors } } = useForm<AdminCategoryInput>({ defaultValues: defaults });

  return (
    <>
      <form
        className="admin-editor-form admin-category-form"
        onSubmit={handleSubmit((data) => startTransition(() => action({ entityId, data })))}
      >
        <fieldset disabled={pending}>
          <legend>Название и адрес</legend>
          <div className="admin-editor-grid">
            <label className="admin-editor-field admin-editor-wide">
              <span>Полное название</span>
              <input {...register("name", { required: "Укажите название." })} maxLength={128} autoFocus />
              <FieldError client={errors.name?.message} server={state.fieldErrors?.name} />
            </label>
            <label className="admin-editor-field">
              <span>Короткое название</span>
              <input {...register("shortName", { required: "Укажите короткое название." })} maxLength={64} />
              <FieldError client={errors.shortName?.message} server={state.fieldErrors?.shortName} />
            </label>
            <label className="admin-editor-field">
              <span>Slug</span>
              <input {...register("slug", { required: "Укажите slug." })} maxLength={96} autoCapitalize="none" spellCheck={false} />
              <FieldError client={errors.slug?.message} server={state.fieldErrors?.slug} />
            </label>
            <label className="admin-editor-field admin-editor-wide">
              <span>Короткая подпись</span>
              <input {...register("eyebrow")} maxLength={128} placeholder="Например, Для компании" />
              <FieldError client={errors.eyebrow?.message} server={state.fieldErrors?.eyebrow} />
            </label>
          </div>
        </fieldset>

        <fieldset disabled={pending}>
          <legend>Порядок и публикация</legend>
          <div className="admin-editor-grid">
            <label className="admin-editor-field">
              <span>Порядок</span>
              <input {...register("sortOrder", { required: "Укажите порядок." })} inputMode="numeric" />
              <FieldError client={errors.sortOrder?.message} server={state.fieldErrors?.sortOrder} />
            </label>
            <label className="admin-editor-switch">
              <input type="checkbox" {...register("isPublished")} />
              <span><strong>Показывать в меню</strong><small>Скрытая категория скрывает и её товары.</small></span>
            </label>
          </div>
        </fieldset>

        <ActionError state={state} />
        <div className="admin-editor-actions">
          <button type="submit" disabled={pending}>{pending ? "Сохраняем…" : "Сохранить категорию"}</button>
          <a href="/admin/catalog">Отмена</a>
        </div>
      </form>

      {entityId ? <AdminCategoryDeleteForm entityId={entityId} productCount={productCount ?? 0} /> : null}
    </>
  );
}

function AdminCategoryDeleteForm({ entityId, productCount }: { entityId: string; productCount: number }) {
  const [state, action, pending] = useActionState(deleteCategoryAction, initialActionState);
  const blocked = productCount > 0;
  return (
    <section className="admin-danger-zone" aria-labelledby="delete-category-title">
      <div>
        <h2 id="delete-category-title">Удалить категорию</h2>
        <p>{blocked ? `В категории ${productCount} товаров. Сначала перенесите или удалите их.` : "Категория удаляется без возможности восстановления."}</p>
      </div>
      <form action={action}>
        <input type="hidden" name="entityId" value={entityId} />
        <label><input type="checkbox" name="confirmation" value={entityId} required disabled={blocked || pending} /> Подтверждаю удаление</label>
        <button type="submit" disabled={blocked || pending}>{pending ? "Удаляем…" : "Удалить категорию"}</button>
        <ActionError state={state} />
      </form>
    </section>
  );
}

export type AdminCategoryOption = {
  id: string;
  name: string;
  slug: string;
  isPublished: boolean;
};

export function AdminProductForm({
  entityId,
  defaults,
  categories,
}: {
  entityId: string | null;
  defaults: AdminProductInput;
  categories: AdminCategoryOption[];
}) {
  const [state, action, pending] = useActionState(saveProductAction, initialActionState);
  const { register, handleSubmit, control, formState: { errors } } = useForm<AdminProductInput>({ defaultValues: defaults });
  const selectedImage = useWatch({ control, name: "imagePath" });

  return (
    <>
      <form
        className="admin-editor-form admin-product-form"
        onSubmit={handleSubmit((data) => startTransition(() => action({ entityId, data })))}
      >
        <fieldset disabled={pending}>
          <legend>Основное</legend>
          <div className="admin-editor-grid">
            <label className="admin-editor-field admin-editor-wide">
              <span>Название товара</span>
              <input {...register("name", { required: "Укажите название." })} maxLength={160} autoFocus />
              <FieldError client={errors.name?.message} server={state.fieldErrors?.name} />
            </label>
            <label className="admin-editor-field">
              <span>Категория</span>
              <select {...register("categoryId", { required: "Выберите категорию." })}>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}{category.isPublished ? "" : " — скрыта"}
                  </option>
                ))}
              </select>
              <FieldError client={errors.categoryId?.message} server={state.fieldErrors?.categoryId} />
            </label>
            <label className="admin-editor-field">
              <span>Slug</span>
              <input {...register("slug", { required: "Укажите slug." })} maxLength={128} autoCapitalize="none" spellCheck={false} />
              <FieldError client={errors.slug?.message} server={state.fieldErrors?.slug} />
            </label>
            <label className="admin-editor-field admin-editor-wide">
              <span>Описание</span>
              <textarea {...register("description", { required: "Добавьте описание." })} rows={4} maxLength={2_000} />
              <FieldError client={errors.description?.message} server={state.fieldErrors?.description} />
            </label>
            <label className="admin-editor-field">
              <span>Состав</span>
              <textarea {...register("ingredientsText", { required: "Добавьте состав." })} rows={6} placeholder="Один ингредиент на строку" />
              <FieldError client={errors.ingredientsText?.message} server={state.fieldErrors?.ingredientsText} />
            </label>
            <label className="admin-editor-field">
              <span>Аллергены</span>
              <textarea {...register("allergensText")} rows={6} placeholder="Один аллерген на строку" />
              <FieldError client={errors.allergensText?.message} server={state.fieldErrors?.allergensText} />
            </label>
          </div>
        </fieldset>

        <fieldset disabled={pending}>
          <legend>Фотография</legend>
          <p className="admin-editor-hint">Можно выбрать только подготовленный локальный asset из каталога проекта.</p>
          <div className="admin-image-picker">
            {PRODUCT_IMAGE_OPTIONS.map((image) => (
              <label key={image.path} data-selected={selectedImage === image.path}>
                <input type="radio" value={image.path} {...register("imagePath", { required: "Выберите изображение." })} />
                <Image src={image.path} alt="" width={180} height={128} sizes="(max-width: 620px) 42vw, 150px" />
                <span>{image.label}</span>
              </label>
            ))}
          </div>
          <FieldError client={errors.imagePath?.message} server={state.fieldErrors?.imagePath} />
          <label className="admin-editor-field admin-editor-wide">
            <span>Alt-текст</span>
            <input {...register("imageAlt", { required: "Опишите изображение." })} maxLength={255} />
            <FieldError client={errors.imageAlt?.message} server={state.fieldErrors?.imageAlt} />
          </label>
        </fieldset>

        <fieldset disabled={pending}>
          <legend>Цена и порция</legend>
          <div className="admin-editor-grid admin-measure-grid">
            <label className="admin-editor-field">
              <span>Цена, ₽</span>
              <input {...register("priceRubles", { required: "Укажите цену." })} inputMode="decimal" placeholder="649,00" />
              <FieldError client={errors.priceRubles?.message} server={state.fieldErrors?.priceRubles} />
            </label>
            <label className="admin-editor-field">
              <span>Вес, г</span>
              <input {...register("weightGrams")} inputMode="numeric" />
              <FieldError client={errors.weightGrams?.message} server={state.fieldErrors?.weightGrams} />
            </label>
            <label className="admin-editor-field">
              <span>Объём, мл</span>
              <input {...register("volumeMl")} inputMode="numeric" />
              <FieldError client={errors.volumeMl?.message} server={state.fieldErrors?.volumeMl} />
            </label>
            <label className="admin-editor-field">
              <span>Штук</span>
              <input {...register("piecesCount")} inputMode="numeric" />
              <FieldError client={errors.piecesCount?.message} server={state.fieldErrors?.piecesCount} />
            </label>
            <label className="admin-editor-field">
              <span>Бейдж</span>
              <input {...register("badge")} maxLength={64} placeholder="Хит" />
              <FieldError client={errors.badge?.message} server={state.fieldErrors?.badge} />
            </label>
            <label className="admin-editor-field">
              <span>Порядок</span>
              <input {...register("sortOrder", { required: "Укажите порядок." })} inputMode="numeric" />
              <FieldError client={errors.sortOrder?.message} server={state.fieldErrors?.sortOrder} />
            </label>
          </div>
        </fieldset>

        <fieldset disabled={pending}>
          <legend>Состояние в меню</legend>
          <div className="admin-switch-grid">
            <label className="admin-editor-switch"><input type="checkbox" {...register("isPublished")} /><span><strong>Опубликован</strong><small>Виден в клиентском каталоге.</small></span></label>
            <label className="admin-editor-switch"><input type="checkbox" {...register("isAvailable")} /><span><strong>Доступен</strong><small>Можно добавить в корзину.</small></span></label>
            <label className="admin-editor-switch"><input type="checkbox" {...register("isFeatured")} /><span><strong>В центре внимания</strong><small>Показывается на главной.</small></span></label>
            <label className="admin-editor-switch"><input type="checkbox" {...register("isRecommended")} /><span><strong>Рекомендуем</strong><small>Попадает в подборку рекомендаций.</small></span></label>
          </div>
        </fieldset>

        <ActionError state={state} />
        <div className="admin-editor-actions">
          <button type="submit" disabled={pending}>{pending ? "Сохраняем…" : "Сохранить товар"}</button>
          <a href="/admin/catalog">Отмена</a>
        </div>
      </form>

      {entityId ? <AdminProductDeleteForm entityId={entityId} /> : null}
    </>
  );
}

function AdminProductDeleteForm({ entityId }: { entityId: string }) {
  const [state, action, pending] = useActionState(deleteProductAction, initialActionState);
  return (
    <section className="admin-danger-zone" aria-labelledby="delete-product-title">
      <div><h2 id="delete-product-title">Удалить товар</h2><p>Снимки товара в существующих заказах сохранятся, но карточку восстановить автоматически нельзя.</p></div>
      <form action={action}>
        <input type="hidden" name="entityId" value={entityId} />
        <label><input type="checkbox" name="confirmation" value={entityId} required disabled={pending} /> Подтверждаю удаление</label>
        <button type="submit" disabled={pending}>{pending ? "Удаляем…" : "Удалить товар"}</button>
        <ActionError state={state} />
      </form>
    </section>
  );
}
