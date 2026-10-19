import { ReceiptText } from "lucide-react";
import { StatePanel } from "@/components/miniapp/state-panel";

export default function OrderNotFound() {
  return (
    <div className="page-width route-state-wrap">
      <StatePanel icon={ReceiptText} title="Заказ не найден" description="Проверьте ссылку или вернитесь к списку заказов. Чужие заказы по ссылке не открываются." action={{ href: "/orders", label: "К заказам" }} />
    </div>
  );
}
