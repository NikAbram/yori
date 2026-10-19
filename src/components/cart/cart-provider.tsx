"use client";

import { createContext, useCallback, useContext, useMemo, useSyncExternalStore } from "react";
import type { CartLine } from "@/types/catalog";

const STORAGE_KEY = "yori-cart-v1";
const CHANGE_EVENT = "yori-cart-change";
const MAX_QUANTITY = 20;

type StoredCart = { version: 1; lines: CartLine[] };
type CartContextValue = {
  lines: CartLine[];
  itemCount: number;
  hydrated: boolean;
  addItem: (productId: string, quantity?: number) => void;
  setQuantity: (productId: string, quantity: number) => void;
  removeItem: (productId: string) => void;
  clear: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

function isStoredCart(value: unknown): value is StoredCart {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<StoredCart>;
  return candidate.version === 1 && Array.isArray(candidate.lines) && candidate.lines.every((line) =>
    typeof line?.productId === "string" && Number.isInteger(line.quantity) && line.quantity > 0 && line.quantity <= MAX_QUANTITY,
  );
}

function parseLines(raw: string) {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    return isStoredCart(parsed) ? parsed.lines : [];
  } catch {
    return [];
  }
}

function getSnapshot() { return localStorage.getItem(STORAGE_KEY) ?? ""; }
function getServerSnapshot() { return ""; }
function subscribe(callback: () => void) {
  window.addEventListener(CHANGE_EVENT, callback);
  window.addEventListener("storage", callback);
  return () => { window.removeEventListener(CHANGE_EVENT, callback); window.removeEventListener("storage", callback); };
}
function writeLines(lines: CartLine[]) {
  const payload: StoredCart = { version: 1, lines };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const raw = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const lines = useMemo(() => parseLines(raw), [raw]);

  const addItem = useCallback((productId: string, quantity = 1) => {
    const current = parseLines(getSnapshot());
    const found = current.find((line) => line.productId === productId);
    writeLines(found
      ? current.map((line) => line.productId === productId ? { ...line, quantity: Math.min(MAX_QUANTITY, line.quantity + quantity) } : line)
      : [...current, { productId, quantity: Math.min(MAX_QUANTITY, Math.max(1, quantity)) }]);
  }, []);

  const setQuantity = useCallback((productId: string, quantity: number) => {
    const current = parseLines(getSnapshot());
    writeLines(quantity <= 0
      ? current.filter((line) => line.productId !== productId)
      : current.map((line) => line.productId === productId ? { ...line, quantity: Math.min(MAX_QUANTITY, quantity) } : line));
  }, []);

  const removeItem = useCallback((productId: string) => writeLines(parseLines(getSnapshot()).filter((line) => line.productId !== productId)), []);
  const clear = useCallback(() => writeLines([]), []);
  const itemCount = lines.reduce((sum, line) => sum + line.quantity, 0);
  const value = useMemo(() => ({ lines, itemCount, hydrated: true, addItem, setQuantity, removeItem, clear }), [lines, itemCount, addItem, setQuantity, removeItem, clear]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used inside CartProvider");
  return context;
}
