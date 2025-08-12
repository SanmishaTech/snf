import React, { createContext, useContext, useEffect, useMemo, useReducer } from "react";
import type { ProductWithPricing, DepotVariant } from "../types";

// Types
export interface CartItem {
  productId: number;
  variantId: number;
  name: string;
  variantName: string;
  price: number; // unit price
  quantity: number;
  imageUrl?: string;
}

interface CartState {
  items: CartItem[];
}

type CartAction =
  | { type: "ADD_ITEM"; payload: CartItem }
  | { type: "REMOVE_ITEM"; payload: { variantId: number } }
  | { type: "INCREMENT"; payload: { variantId: number } }
  | { type: "DECREMENT"; payload: { variantId: number } }
  | { type: "CLEAR" }
  | { type: "SET"; payload: CartState };

interface CartContextType {
  state: CartState;
  addItem: (product: ProductWithPricing, variant: DepotVariant, quantity?: number) => void;
  removeItem: (variantId: number) => void;
  increment: (variantId: number) => void;
  decrement: (variantId: number) => void;
  clear: () => void;
  totalQuantity: number;
  subtotal: number;
}

const initialState: CartState = {
  items: [],
};

const STORAGE_KEY = "snf.cart";

function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case "SET":
      return action.payload;
    case "ADD_ITEM": {
      const existingIndex = state.items.findIndex(
        (it) => it.variantId === action.payload.variantId
      );
      if (existingIndex >= 0) {
        const next = [...state.items];
        next[existingIndex] = {
          ...next[existingIndex],
          quantity: next[existingIndex].quantity + action.payload.quantity,
        };
        return { items: next };
      }
      return { items: [...state.items, action.payload] };
    }
    case "REMOVE_ITEM": {
      return { items: state.items.filter((it) => it.variantId !== action.payload.variantId) };
    }
    case "INCREMENT": {
      return {
        items: state.items.map((it) =>
          it.variantId === action.payload.variantId
            ? { ...it, quantity: Math.min(99, it.quantity + 1) }
            : it
        ),
      };
    }
    case "DECREMENT": {
      return {
        items: state.items
          .map((it) =>
            it.variantId === action.payload.variantId
              ? { ...it, quantity: Math.max(1, it.quantity - 1) }
              : it
          ),
      };
    }
    case "CLEAR":
      return { items: [] };
    default:
      return state;
  }
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(
    cartReducer,
    initialState,
    (init) => {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as CartState;
          if (parsed && Array.isArray(parsed.items)) {
            return parsed;
          }
        }
      } catch {
        // ignore corrupted storage
      }
      return init;
    }
  );

  // Persist to storage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // ignore
    }
  }, [state]);

  const subtotal = useMemo(
    () => state.items.reduce((sum, it) => sum + it.price * it.quantity, 0),
    [state.items]
  );

  const totalQuantity = useMemo(
    () => state.items.reduce((sum, it) => sum + it.quantity, 0),
    [state.items]
  );

  const addItem = (product: ProductWithPricing, variant: DepotVariant, quantity: number = 1) => {
    const price = (variant?.buyOncePrice || variant?.mrp || 0) as number;
    const rawAttachment = product?.product?.attachmentUrl;
    const imageUrl = rawAttachment
      ? `${import.meta.env.VITE_BACKEND_URL}${rawAttachment}`
      : undefined;
    const item: CartItem = {
      productId: product.product.id,
      variantId: variant.id,
      name: product.product.name,
      variantName: variant.name || "",
      price: typeof price === "number" ? price : 0,
      quantity: Math.max(1, Math.min(99, quantity || 1)),
      imageUrl,
    };
    dispatch({ type: "ADD_ITEM", payload: item });
  };

  const removeItem = (variantId: number) => dispatch({ type: "REMOVE_ITEM", payload: { variantId } });
  const increment = (variantId: number) => dispatch({ type: "INCREMENT", payload: { variantId } });
  const decrement = (variantId: number) => dispatch({ type: "DECREMENT", payload: { variantId } });
  const clear = () => dispatch({ type: "CLEAR" });

  const value: CartContextType = {
    state,
    addItem,
    removeItem,
    increment,
    decrement,
    clear,
    subtotal,
    totalQuantity,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};

export function useCart(): CartContextType {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}



