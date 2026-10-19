import type { Metadata } from "next";
import { CheckoutExperience } from "@/components/miniapp/checkout-experience";

export const metadata: Metadata = { title: "Оформление", robots: { index: false, follow: false } };

export default function CheckoutPage() {
  return <CheckoutExperience />;
}
