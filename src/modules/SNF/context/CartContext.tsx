import React, { createContext, useContext, useEffect, useMemo, useReducer, useCallback } from "react";
import type { ProductWithPricing, DepotVariant } from "../types";
import { CartValidationService } from "../services/cartValidation";

// Types
export interface CartItem {
  productId: number;
  variantId: number;
  name: string;
  variantName: string;
  price: number; // unit price
  quantity: number;
  imageUrl?: string;
  depotId: number; // Track which depot this item was added from
  originalDepotId?: number; // Track the original depot this item was first added from
  originalVariantId?: number; // Track the original variant ID from the first depot
  isAvailable?: boolean; // Track availability in current depot
  unavailableReason?: string; // Reason why item is unavailable
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
  | { type: "SET"; payload: CartState }
  | { type: "UPDATE_AVAILABILITY"; payload: { variantId: number; isAvailable: boolean; unavailableReason?: string } }
  | { type: "VALIDATE_CART"; payload: { items: CartItem[] } };

interface CartContextType {
  state: CartState;
  addItem: (product: ProductWithPricing, variant: DepotVariant, quantity?: number) => void;
  removeItem: (variantId: number) => void;
  increment: (variantId: number) => void;
  decrement: (variantId: number) => void;
  clear: () => void;
  validateCart: (currentDepotId: number) => Promise<void>;
  getAvailableItems: () => CartItem[];
  getUnavailableItems: () => CartItem[];
  totalQuantity: number;
  subtotal: number;
  availableSubtotal: number;
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
          // Update depot info if adding from different depot
          depotId: action.payload.depotId,
          // Preserve original depot info if it exists, otherwise use new one
          originalDepotId: next[existingIndex].originalDepotId || action.payload.originalDepotId,
          originalVariantId: next[existingIndex].originalVariantId || action.payload.originalVariantId,
          isAvailable: action.payload.isAvailable,
          unavailableReason: action.payload.unavailableReason,
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
    case "UPDATE_AVAILABILITY": {
      return {
        items: state.items.map((it) =>
          it.variantId === action.payload.variantId
            ? { 
                ...it, 
                isAvailable: action.payload.isAvailable,
                unavailableReason: action.payload.unavailableReason 
              }
            : it
        ),
      };
    }
    case "VALIDATE_CART": {
      return { items: action.payload.items };
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

  const availableSubtotal = useMemo(
    () => state.items
      .filter(item => item.isAvailable !== false)
      .reduce((sum, it) => sum + it.price * it.quantity, 0),
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
      depotId: variant.depotId,
      originalDepotId: variant.depotId, // Store original depot ID
      originalVariantId: variant.id, // Store original variant ID
      isAvailable: true, // Assume available when adding
    };
    dispatch({ type: "ADD_ITEM", payload: item });
  };

  const removeItem = (variantId: number) => dispatch({ type: "REMOVE_ITEM", payload: { variantId } });
  const increment = (variantId: number) => dispatch({ type: "INCREMENT", payload: { variantId } });
  const decrement = (variantId: number) => dispatch({ type: "DECREMENT", payload: { variantId } });
  const clear = () => dispatch({ type: "CLEAR" });

  const validateCart = useCallback(async (currentDepotId: number) => {
    console.log('[CartContext] Starting cart validation for depot:', currentDepotId);
    
    // Get current items from state at the time of validation
    const currentItems = state.items;
    
    if (currentItems.length === 0) {
      console.log('[CartContext] No items to validate');
      return;
    }
    
    try {
      const validationResult = await CartValidationService.validateCartItems(currentItems, currentDepotId);
      
      console.log('[CartContext] Validation completed:', {
        total: validationResult.validatedItems.length,
        available: validationResult.availableItems.length,
        unavailable: validationResult.unavailableItems.length
      });
      dispatch({ type: "VALIDATE_CART", payload: { items: validationResult.validatedItems } });
    } catch (error) {
      console.error('[CartContext] Error validating cart:', error);
      // Mark all items as potentially unavailable on error
      const errorItems = currentItems.map(item => ({
        ...item,
        isAvailable: false,
        unavailableReason: 'Unable to verify availability'
      }));
      dispatch({ type: "VALIDATE_CART", payload: { items: errorItems } });
    }
  }, [state.items]); // Include state.items in dependencies to get fresh items

  const getAvailableItems = (): CartItem[] => {
    return state.items.filter(item => item.isAvailable !== false);
  };

  const getUnavailableItems = (): CartItem[] => {
    return state.items.filter(item => item.isAvailable === false);
  };

  const value: CartContextType = {
    state,
    addItem,
    removeItem,
    increment,
    decrement,
    clear,
    validateCart,
    getAvailableItems,
    getUnavailableItems,
    subtotal,
    availableSubtotal,
    totalQuantity,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};

export function useCart(): CartContextType {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}



