export type OrderStatus =
  | "NEW"
  | "CONFIRMED"
  | "COOKING"
  | "COURIER"
  | "DELIVERED"
  | "CANCELLED";

export type OrderLinePreview = {
  productNameSnapshot: string;
  quantity: number;
  unitPriceKopeks: number;
};

export type OrderStatusStep = {
  status: Exclude<OrderStatus, "CANCELLED">;
  label: string;
  description: string;
};

export type OrderPreview = {
  id: string;
  orderNo: string;
  status: OrderStatus;
  statusLabel: string;
  placedAtLabel: string;
  items: OrderLinePreview[];
  subtotalKopeks: number;
  deliveryKopeks: number;
  totalKopeks: number;
};
