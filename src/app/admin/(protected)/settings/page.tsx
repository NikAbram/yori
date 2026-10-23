import type { Metadata } from "next";

import { AdminSettingsForm } from "@/components/admin/admin-settings-form";
import { getAdminSettingsEditor } from "@/services/settings";

export const metadata: Metadata = { title: "Настройки" };
export const instant = false;

function rublesInput(kopeks: number | null) {
  if (kopeks === null) return "";
  const rubles = Math.floor(kopeks / 100);
  const remainder = kopeks % 100;
  return remainder ? `${rubles},${String(remainder).padStart(2, "0")}` : String(rubles);
}

export default async function AdminSettingsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ settings, orderMode, readiness, canConfirmLive }, params] = await Promise.all([
    getAdminSettingsEditor(),
    searchParams,
  ]);
  const saved = params.result === "saved";

  return (
    <div className="admin-workspace admin-settings-page">
      <section className="admin-settings-title" aria-labelledby="admin-settings-title">
        <div>
          <p>Операционная конфигурация</p>
          <h1 id="admin-settings-title">Настройки</h1>
          <span>Доставка, оплата и сведения, которые видит клиент.</span>
        </div>
        <div className="admin-mode-stamp" data-mode={orderMode.value}>
          <span>ORDER_MODE</span>
          <strong>{orderMode.label}</strong>
          <small>Меняется только в окружении сервера</small>
        </div>
      </section>

      {saved ? <p className="admin-catalog-notice" role="status">Настройки сохранены и публичные страницы обновлены.</p> : null}

      <AdminSettingsForm
        expectedUpdatedAt={settings.updatedAt?.toISOString() ?? null}
        canConfirmLive={canConfirmLive}
        orderMode={orderMode}
        readiness={readiness}
        liveReadyAt={settings.liveReadyAt?.toISOString() ?? null}
        updatedBy={settings.updatedByAdmin?.name ?? null}
        defaults={{
          brandName: settings.brandName,
          brandDescription: settings.brandDescription ?? "",
          minimumOrderRubles: rublesInput(settings.minimumOrderKopeks),
          deliveryRubles: rublesInput(settings.deliveryKopeks),
          freeDeliveryFromRubles: rublesInput(settings.freeDeliveryFromKopeks),
          deliveryTerms: settings.deliveryTerms ?? "",
          contactText: settings.contactText ?? "",
          privacyText: settings.privacyText ?? "",
          operatorName: settings.operatorName ?? "",
          managerTelegramChatId: settings.managerTelegramChatId ?? "",
          isOrderingEnabled: settings.isOrderingEnabled,
          cashOnDeliveryEnabled: settings.cashOnDeliveryEnabled,
          cardOnDeliveryEnabled: settings.cardOnDeliveryEnabled,
          commercialHostingConfirmed: settings.commercialHostingConfirmed,
          liveReadinessConfirmed: settings.liveReadyAt !== null,
        }}
      />
    </div>
  );
}
