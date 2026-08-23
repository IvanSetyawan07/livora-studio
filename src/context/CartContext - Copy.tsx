import { createContext, useContext, useMemo, useState, ReactNode } from "react";

export interface CartItem {
  id: string;
  name: string;
  price: number; // IDR; 0 = inquiry
  qty: number;
}

interface CartCtx {
  items: CartItem[];
  count: number;
  total: number;
  open: boolean;
  setOpen: (v: boolean) => void;
  add: (item: Omit<CartItem, "qty">) => void;
  remove: (id: string) => void;
  setQty: (id: string, qty: number) => void;
  clear: () => void;
}

const Ctx = createContext<CartCtx | null>(null);

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const [items, setItems] = useState<CartItem[]>([]);
  const [open, setOpen] = useState(false);

  const add: CartCtx["add"] = (item) =>
    setItems((cur) => {
      const ex = cur.find((i) => i.id === item.id);
      if (ex) return cur.map((i) => (i.id === item.id ? { ...i, qty: i.qty + 1 } : i));
      return [...cur, { ...item, qty: 1 }];
    });
  const remove: CartCtx["remove"] = (id) => setItems((cur) => cur.filter((i) => i.id !== id));
  const setQty: CartCtx["setQty"] = (id, qty) =>
    setItems((cur) =>
      qty <= 0 ? cur.filter((i) => i.id !== id) : cur.map((i) => (i.id === id ? { ...i, qty } : i))
    );
  const clear = () => setItems([]);

  const value = useMemo<CartCtx>(
    () => ({
      items,
      open,
      setOpen,
      add,
      remove,
      setQty,
      clear,
      count: items.reduce((s, i) => s + i.qty, 0),
      total: items.reduce((s, i) => s + i.price * i.qty, 0),
    }),
    [items, open]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
};

export const useCart = () => {
  const c = useContext(Ctx);
  if (!c) throw new Error("useCart must be used within CartProvider");
  return c;
};
