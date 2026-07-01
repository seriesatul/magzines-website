"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

export type CartItem = {
  id: string;
  slug: string;
  name: string;
  pricePaise: number;
  imageUrl: string;
  imageAlt: string;
  quantity: number;
};

type CartContextValue = {
  items: CartItem[];
  itemCount: number;
  subtotalPaise: number;
  addItem: (item: Omit<CartItem, "quantity">, quantity?: number) => void;
  updateQuantity: (id: string, quantity: number) => void;
  removeItem: (id: string) => void;
  clearCart: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

const STORAGE_KEY = "hearts-and-beans-cart";

export function CartProvider({ children }: { children: React.ReactNode }): React.ReactElement {
  const [items, setItems] = useState<CartItem[]>([]);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        return;
      }

      const parsed = JSON.parse(raw) as CartItem[];
      if (Array.isArray(parsed)) {
        setItems(parsed);
      }
    } catch {
      setItems([]);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  const value = useMemo<CartContextValue>(() => {
    const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
    const subtotalPaise = items.reduce(
      (sum, item) => sum + item.pricePaise * item.quantity,
      0
    );

    return {
      items,
      itemCount,
      subtotalPaise,
      addItem: (item, quantity = 1) => {
        setItems((current) => {
          const existing = current.find((entry) => entry.id === item.id);
          if (existing) {
            return current.map((entry) =>
              entry.id === item.id
                ? { ...entry, quantity: entry.quantity + quantity }
                : entry
            );
          }

          return [...current, { ...item, quantity }];
        });
      },
      updateQuantity: (id, quantity) => {
        setItems((current) =>
          quantity <= 0
            ? current.filter((entry) => entry.id !== id)
            : current.map((entry) => (entry.id === id ? { ...entry, quantity } : entry))
        );
      },
      removeItem: (id) => {
        setItems((current) => current.filter((entry) => entry.id !== id));
      },
      clearCart: () => {
        setItems([]);
      }
    };
  }, [items]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const context = useContext(CartContext);

  if (!context) {
    throw new Error("useCart must be used within a CartProvider");
  }

  return context;
}
