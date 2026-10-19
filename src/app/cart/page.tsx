import type { Metadata } from "next";
import { CartExperience } from "@/components/miniapp/cart-experience";

export const metadata: Metadata = { title: "Корзина", robots: { index: false, follow: false } };
export default function CartPage() { return <CartExperience />; }
