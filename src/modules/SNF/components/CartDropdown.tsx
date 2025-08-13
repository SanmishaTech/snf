import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ShoppingCart, Trash2, Minus, Plus, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useCart } from "../context/CartContext";
import { useDeliveryLocation } from "../hooks/useDeliveryLocation";

const currency = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });

export const CartDropdown: React.FC = () => {
  const { 
    state, 
    subtotal, 
    availableSubtotal, 
    totalQuantity, 
    increment, 
    decrement, 
    removeItem, 
    validateCart,
    getAvailableItems,
    getUnavailableItems 
  } = useCart();
  const { currentDepotId } = useDeliveryLocation();
  const [bump, setBump] = useState(false);
  const [isValidating, setIsValidating] = useState(false);

  const availableItems = getAvailableItems();
  const unavailableItems = getUnavailableItems();

  useEffect(() => {
    setBump(true);
    const t = setTimeout(() => setBump(false), 300);
    return () => clearTimeout(t);
  }, [totalQuantity]);

  // Validate cart when depot changes
  useEffect(() => {
    if (state.items.length > 0 && currentDepotId) {
      setIsValidating(true);
      validateCart(currentDepotId).finally(() => {
        setIsValidating(false);
      });
    }
  }, [currentDepotId, validateCart, state.items.length]);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          id="snf-cart-button"
          className="relative inline-flex items-center justify-center rounded-md h-9 w-9 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-ring"
          aria-label="Cart"
        >
          <ShoppingCart className="size-5" aria-hidden={true} />
          <span
            className={`absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-primary text-[10px] text-primary-foreground grid place-items-center transition-transform duration-300 ${bump ? "scale-110" : ""}`}
            aria-live="polite"
            aria-atomic="true"
          >
            {totalQuantity}
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" sideOffset={8} className="z-[60] w-80 sm:w-96 p-0">
        <div className="p-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Your Cart</h3>
            <span className="text-xs text-muted-foreground">{totalQuantity} items</span>
          </div>
        </div>
        <Separator />
        <div className="max-h-80 overflow-y-auto">
          {state.items.length === 0 ? (
            <div className="p-4 text-sm text-muted-foreground">Your cart is empty.</div>
          ) : (
            <ul className="divide-y">
              {state.items.map((it) => (
                <li key={it.variantId} className="p-3 flex gap-3">
                  <div className="size-14 shrink-0 rounded-md overflow-hidden bg-muted/30 grid place-items-center">
                    {it.imageUrl ? (
                      <img src={it.imageUrl} alt={it.name} className="h-full w-full object-cover" loading="lazy" />
                    ) : (
                      <span className="text-xs text-muted-foreground">No image</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{it.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{it.variantName}</p>
                      </div>
                      <button
                        className="p-1 rounded hover:bg-accent"
                        onClick={() => removeItem(it.variantId)}
                        aria-label={`Remove ${it.name}`}
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                      <div className="inline-flex items-center gap-2 border rounded-md px-2 py-1">
                        <button
                          className="p-1 rounded hover:bg-accent"
                          onClick={() => decrement(it.variantId)}
                          aria-label="Decrease quantity"
                        >
                          <Minus className="size-4" />
                        </button>
                        <span className="text-sm w-5 text-center">{it.quantity}</span>
                        <button
                          className="p-1 rounded hover:bg-accent"
                          onClick={() => increment(it.variantId)}
                          aria-label="Increase quantity"
                        >
                          <Plus className="size-4" />
                        </button>
                      </div>
                      <div className="text-sm font-medium">{currency.format(it.price * it.quantity)}</div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
        <Separator />
        <div className="p-3 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Subtotal</span>
            <span className="font-semibold">{currency.format(subtotal)}</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link to="/snf">Continue shopping</Link>
            </Button>
            <Button size="sm" disabled={state.items.length === 0} asChild>
              <Link to="/snf/checkout">Checkout</Link>
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};





