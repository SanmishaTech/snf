import React, { useEffect, useState, useRef } from "react";
import { Link } from "react-router-dom";
import { ShoppingCart, Trash2, Minus, Plus, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger, PopoverArrow } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";

import { useCart } from "../context/CartContext";
import { useDeliveryLocation } from "../hooks/useDeliveryLocation";
import ProductImage from "./ProductImage";

const currency = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });

export const CartDropdown: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
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
  const [isOpen, setIsOpen] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const lastValidatedDepotRef = useRef<number | null>(null);
  const hasItemsRef = useRef(false);

  const availableItems = getAvailableItems();
  const unavailableItems = getUnavailableItems();

  // Track if we have items to avoid unnecessary validations
  hasItemsRef.current = state.items.length > 0;

  useEffect(() => {
    setBump(true);
    const t = setTimeout(() => setBump(false), 300);
    return () => clearTimeout(t);
  }, [totalQuantity]);

  // Initial validation when component mounts with existing items
  useEffect(() => {
    if (state.items.length > 0 && currentDepotId && lastValidatedDepotRef.current === null) {
      setIsValidating(true);
      lastValidatedDepotRef.current = currentDepotId;

      validateCart(currentDepotId).finally(() => {
        setIsValidating(false);
      });
    }
  }, []); // Only run once on mount

  // Validate cart when depot changes (but not when items are just updated)
  useEffect(() => {
    const hasItems = hasItemsRef.current;
    const depotChanged = currentDepotId !== lastValidatedDepotRef.current;

    if (hasItems && currentDepotId && depotChanged && !isValidating) {
      setIsValidating(true);
      lastValidatedDepotRef.current = currentDepotId;

      validateCart(currentDepotId).finally(() => {
        setIsValidating(false);
      });
    }
  }, [currentDepotId, isValidating]);

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        {children || (
          <button
            id="snf-cart-button"
            className="relative inline-flex items-center justify-center rounded-md h-9 w-9 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-ring"
            aria-label="Cart"
          >
            <ShoppingCart className="size-5" aria-hidden={true} />
            <span
              className={`absolute -top-1.5 -right-1.5 min-w-5 h-5 px-1 rounded-full bg-primary text-[10px] font-bold text-primary-foreground grid place-items-center transition-all duration-300 shadow-sm ${bump ? "scale-125 shadow-md -translate-y-0.5" : "scale-100"}`}
              aria-live="polite"
              aria-atomic="true"
            >
              {totalQuantity}
            </span>
          </button>
        )}
      </PopoverTrigger>
      <PopoverContent align="center" sideOffset={16} alignOffset={0} className="z-[60] w-[calc(100vw-2rem)] sm:w-96 p-0 rounded-2xl shadow-xl overflow-hidden">
        <PopoverArrow className="fill-popover w-4 h-2 opacity-100 drop-shadow-sm" />
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
            <>
              {isValidating && (
                <div className="p-3 text-sm text-muted-foreground flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                  Checking availability...
                </div>
              )}

              {/* Available Items */}
              {availableItems.length > 0 && (
                <ul className="divide-y">
                  {availableItems.map((it) => (
                    <li key={it.variantId} className="p-3 flex gap-3">
                      <ProductImage
                        src={it.imageUrl}
                        alt={it.name}
                        name={it.name}
                        showNameFallback={false}
                        containerClassName="size-14 shrink-0 rounded-md"
                      />
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

              {/* Unavailable Items */}
              {unavailableItems.length > 0 && (
                <>
                  {availableItems.length > 0 && <Separator />}
                  <div className="p-3 bg-muted/30">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle className="size-4 text-amber-500" />
                      <span className="text-sm font-medium text-muted-foreground">
                        Items unavailable
                      </span>
                    </div>
                    <ul className="divide-y divide-muted-foreground/20">
                      {unavailableItems.map((it) => (
                        <li key={it.variantId} className="py-2 flex gap-3 opacity-60">
                          <ProductImage
                            src={it.imageUrl}
                            alt={it.name}
                            name={it.name}
                            showNameFallback={false}
                            containerClassName="size-14 shrink-0 rounded-md opacity-60"
                            className="grayscale"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <p className="text-sm font-medium truncate line-through">{it.name}</p>
                                <p className="text-xs text-muted-foreground truncate">{it.variantName}</p>
                                <p className="text-xs text-amber-600 mt-1">
                                  {it.unavailableReason || 'Not available in your area'}
                                </p>
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
                              <div className="text-xs text-muted-foreground">
                                Qty: {it.quantity}
                              </div>
                              <div className="text-sm text-muted-foreground line-through">
                                {currency.format(it.price * it.quantity)}
                              </div>
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                </>
              )}
            </>
          )}
        </div>
        <Separator />
        <div className="p-3 space-y-2">
          {unavailableItems.length > 0 && (
            <>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Total</span>
                <span className="text-muted-foreground line-through">{currency.format(subtotal)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Available items</span>
                <span className="font-semibold">{currency.format(availableSubtotal)}</span>
              </div>
              <div className="text-xs text-amber-600 bg-amber-50 p-2 rounded">
                <div className="font-medium mb-1">
                  {unavailableItems.length} item{unavailableItems.length > 1 ? 's' : ''} unavailable
                </div>
                <div className="text-amber-500">
                  These items are not available in your current delivery area and will be removed at checkout
                </div>
              </div>
            </>
          )}

          {unavailableItems.length === 0 && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="font-semibold">{currency.format(subtotal)}</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" size="sm" asChild onClick={() => setIsOpen(false)}>
              <Link to="/snf#all-types">Continue shopping</Link>
            </Button>
            <Button
              size="sm"
              disabled={availableItems.length === 0}
              asChild
            >
              <Link to="/snf/checkout">
                {unavailableItems.length > 0 ? `Checkout (${availableItems.length} items)` : 'Checkout'}
              </Link>
            </Button>
          </div>

        </div>
      </PopoverContent>
    </Popover>
  );
};





