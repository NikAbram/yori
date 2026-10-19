"use client";

import { createContext, useCallback, useContext, useMemo, useSyncExternalStore } from "react";
import type { CartLine } from "@/types/catalog";

const STORAGE_KEY = "yori-cart-v1";
const CHANGE_EVENT = "yori-cart-change";
const MAX_QUANTITY = 20;

type StoredCartV2 = { version: 2; lines: CartLine[] };
type CartContextValue = {
  lines: CartLine[];
  itemCount: number;
  hydrated: boolean;
  addItem: (productId: string, quantity?: number, priceKopeksSnapshot?: number) => void;
  setQuantity: (productId: string, quantity: number) => void;
  removeItem: (productId: string) => void;
  clear: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

function isBaseLine(value: unknown): value is Pick<CartLine, "productId" | "quantity"> {
  if (!value || typeof value !== "object") return false;
  const line = value as Record<string, unknown>;
  return typeof line.productId === "string"
    && Number.isInteger(line.quantity)
    && Number(line.quantity) > 0
    && Number(line.quantity) <= MAX_QUANTITY;
}

function parseLines(raw: string): CartLine[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return [];
    const candidate = parsed as { version?: unknown; lines?: unknown };
    if ((candidate.version !== 1 && candidate.version !== 2) || !Array.isArray(candidate.lines) || !candidate.lines.every(isBaseLine)) return [];
    if (candidate.version === 1) return candidate.lines.map(({ productId, quantity }) => ({ productId, quantity }));

    return candidate.lines.every((line) => {
      const snapshot = (line as Record<string, unknown>).priceKopeksSnapshot;
      return snapshot === undefined || Number.isSafeInteger(snapshot) && Number(snapshot) >= 0;
    }) ? candidate.lines as CartLine[] : [];
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
  const payload: StoredCartV2 = { version: 2, lines };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const raw = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const lines = useMemo(() => parseLines(raw), [raw]);

  const addItem = useCallback((productId: string, quantity = 1, priceKopeksSnapshot?: number) => {
    const current = parseLines(getSnapshot());
    const found = current.find((line) => line.productId === productId);
    writeLines(found
      ? current.map((line) => line.productId === productId ? { ...line, quantity: Math.min(MAX_QUANTITY, line.quantity + quantity), priceKopeksSnapshot: line.priceKopeksSnapshot ?? priceKopeksSnapshot } : line)
      : [...current, { productId, quantity: Math.min(MAX_QUANTITY, Math.max(1, quantity)), priceKopeksSnapshot }]);
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
