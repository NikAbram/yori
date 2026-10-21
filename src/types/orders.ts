export type OrderStatus =
  | "NEW"
  | "CONFIRMED"
  | "COOKING"
  | "COURIER"
  | "DELIVERED"
  | "CANCELLED";

export type OrderStatusStep = {
  status: Exclude<OrderStatus, "CANCELLED">;
  label: string;
  description: string;
};
