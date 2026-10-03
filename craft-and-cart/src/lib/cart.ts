"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";

export type CartLine = {
  productId: number;
  slug: string;
  name: string;
  emoji: string;
  image?: string | null;
  hueA: string;
  hueB: string;
  pricePaise: number;
  color?: string;
  qty: number;
};

type CartState = {
  lines: CartLine[];
  open: boolean;
  add: (line: Omit<CartLine, "qty">, qty?: number) => void;
  setQty: (productId: number, color: string | undefined, qty: number) => void;
  remove: (productId: number, color: string | undefined) => void;
  clear: () => void;
  setOpen: (v: boolean) => void;
};

export const useCart = create<CartState>()(
  persist(
    (set) => ({
      lines: [],
      open: false,
      add: (line, qty = 1) =>
        set((s) => {
          const i = s.lines.findIndex((l) => l.productId === line.productId && l.color === line.color);
          if (i >= 0) {
            const lines = [...s.lines];
            lines[i] = { ...lines[i], qty: Math.min(lines[i].qty + qty, 20) };
            return { lines };
          }
          return { lines: [...s.lines, { ...line, qty }] };
        }),
      setQty: (productId, color, qty) =>
        set((s) => ({
          lines: s.lines
            .map((l) => (l.productId === productId && l.color === color ? { ...l, qty: Math.min(qty, 20) } : l))
            .filter((l) => l.qty > 0),
        })),
      remove: (productId, color) =>
        set((s) => ({ lines: s.lines.filter((l) => !(l.productId === productId && l.color === color)) })),
      clear: () => set({ lines: [] }),
      setOpen: (open) => set({ open }),
    }),
    { name: "craft-cart", partialize: (s) => ({ lines: s.lines }) },
  ),
);

export const cartCount = (lines: CartLine[]) => lines.reduce((n, l) => n + l.qty, 0);
export const cartSubtotal = (lines: CartLine[]) => lines.reduce((n, l) => n + l.qty * l.pricePaise, 0);
