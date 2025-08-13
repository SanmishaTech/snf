import React, { useState, useMemo, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { ProductWithPricing, DepotVariant } from "../types";
import { Check, ChevronDown, Search, X, Minus, Plus } from "lucide-react";

const DEFAULT_DEPOT_ID = 1;

interface ProductCardProps {
  product: ProductWithPricing;
  onAddToCart: (product: ProductWithPricing, variant: DepotVariant, qty?: number) => void;
  // optional: let parent control initial variant
  initialVariantId?: number | null;
  showVariants?: boolean; // New prop to control variant display
}

const VARIANT_PILLS_THRESHOLD = 4;

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  onAddToCart,
  initialVariantId = null,
  showVariants = true,
}) => {
  const [selectedVariantId, setSelectedVariantId] = useState<number | null>(initialVariantId);
  const [isVariantDropdownOpen, setIsVariantDropdownOpen] = useState(false);
  const [variantSearch, setVariantSearch] = useState("");
  const [qty, setQty] = useState(1);

  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const addBtnRef = useRef<HTMLButtonElement | null>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsVariantDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  // Available variants (not hidden, in stock if quantity > 0 or notInStock false)
  const allVariants = product.variants ?? [];
  const availableVariants = useMemo(() => {
    // Allow products without variants to still render; filter only if variants exist
    return allVariants.length > 0
      ? allVariants.filter((v: any) => !v.isHidden && !v.notInStock)
      : [];
  }, [allVariants]);

  // Selected variant or default to first available or first overall
  const selectedVariant = useMemo(() => {
    if (selectedVariantId) {
      return allVariants.find((v: any) => v.id === selectedVariantId) ?? availableVariants[0] ?? allVariants[0];
    }
    return availableVariants[0] ?? allVariants[0];
  }, [selectedVariantId, availableVariants, allVariants]);

  // Price calculations using mrp and buyOncePrice
  const displayPrice = useMemo(() => {
    // If there is a selected variant, use its price; otherwise try to compute
    // a fallback from any variant; otherwise 0
    if (selectedVariant) {
      return selectedVariant.buyOncePrice || selectedVariant.mrp || 0;
    }
    if (allVariants && allVariants.length > 0) {
      const prices = allVariants
        .filter((v: any) => !v.isHidden && !v.notInStock)
        .map((v: any) => v.buyOncePrice || v.mrp || 0)
        .filter((n: number) => typeof n === 'number' && isFinite(n) && n > 0);
      return prices.length > 0 ? Math.min(...prices) : 0;
    }
    return 0;
  }, [selectedVariant, allVariants]);

  const mrpPrice = selectedVariant?.mrp || 0;
  const discount = mrpPrice > displayPrice ? (mrpPrice - displayPrice) / mrpPrice : 0;

  // const isOutOfStock =
  //   !selectedVariant ||
  //   (selectedVariant as any)?.notInStock ||
  //   ((selectedVariant as any)?.closingQty !== undefined && (selectedVariant as any).closingQty <= 0);
  
  const isOutOfStock = false; // As per requirements, all products are always in stock
  const hasMultipleVariants = showVariants && (allVariants?.length || 0) > 1;
  const showPills = hasMultipleVariants && allVariants.length <= VARIANT_PILLS_THRESHOLD;

  const handleVariantSelect = (variantId: number) => {
    setSelectedVariantId(variantId);
    setIsVariantDropdownOpen(false);
  };

  const handleAddToCart = () => {
    // If variants are hidden or no variant selected, create a default variant
    const variantToUse = selectedVariant || {
      id: 0,
      name: 'Default',
      buyOncePrice: product.buyOncePrice,
      mrp: product.mrp,
      productId: product.product.id,
      depotId: DEFAULT_DEPOT_ID,
      hsnCode: '',
      minimumQty: 1,
      closingQty: 999,
      notInStock: false,
      isHidden: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      depot: { id: DEFAULT_DEPOT_ID, name: 'Default Depot', address: '', isOnline: true },
      product: product.product
    } as DepotVariant;
    
    onAddToCart(product, variantToUse, qty);

      // Enhanced fly-to-cart animation starting from the Add to Cart button
      try {
        const imgEl = imgRef.current; // for src only
        const startEl = addBtnRef.current;
        const cartEl = document.getElementById("snf-cart-button");
        if (!startEl || !cartEl) return;

        // Button press micro-interaction
        const prevTransform = startEl.style.transform;
        const prevTransition = startEl.style.transition;
        startEl.style.transition = `${prevTransition ? prevTransition + ', ' : ''}transform 120ms ease`;
        startEl.style.transform = "scale(0.97)";
        setTimeout(() => {
          startEl.style.transform = prevTransform;
          startEl.style.transition = prevTransition;
        }, 140);

        const startRect = startEl.getBoundingClientRect();
        const cartRect = cartEl.getBoundingClientRect();

        const flying = document.createElement("img");
        flying.src = imgEl?.src || "";
        flying.setAttribute("aria-hidden", "true");
        const initialSize = 56; // px
        flying.style.position = "fixed";
        flying.style.left = `${startRect.left + startRect.width / 2 - initialSize / 2}px`;
        flying.style.top = `${startRect.top + startRect.height / 2 - initialSize / 2}px`;
        flying.style.width = `${initialSize}px`;
        flying.style.height = `${initialSize}px`;
        flying.style.objectFit = "cover";
        flying.style.zIndex = "9999";
        flying.style.borderRadius = "8px";
        flying.style.pointerEvents = "none";
        flying.style.boxShadow = "0 4px 12px rgba(0,0,0,0.2)";

        document.body.appendChild(flying);

        const targetX = cartRect.left + cartRect.width / 2 - (startRect.left + startRect.width / 2);
        const targetY = cartRect.top + cartRect.height / 2 - (startRect.top + startRect.height / 2);

        // Phase 1: slight lift and start movement
        const p1X = targetX * 0.2;
        const p1Y = targetY * 0.2 - 20;
        flying.style.transition = "transform 180ms ease-out, opacity 180ms ease-out";
        flying.style.transform = "translate(0px, 0px) scale(0.9)";
        flying.style.opacity = "0.9";
        requestAnimationFrame(() => {
          flying.style.transform = `translate(${p1X}px, ${p1Y}px) scale(1.02)`;
        });

        const onPhase1End = (e: TransitionEvent) => {
          if (e.propertyName !== "transform") return;
          flying.removeEventListener("transitionend", onPhase1End);
          // Phase 2: travel to cart, shrink and fade with slight rotation
          flying.style.transition = "transform 520ms cubic-bezier(0.22, 1, 0.36, 1), opacity 520ms ease";
          flying.style.transform = `translate(${targetX}px, ${targetY}px) scale(0.4) rotate(8deg)`;
          flying.style.opacity = "0.25";

          const onArrive = (ev: TransitionEvent) => {
            if (ev.propertyName !== "transform") return;
            flying.removeEventListener("transitionend", onArrive);
            // Ripple at cart icon
            const color = getComputedStyle(cartEl).color;
            const ripple = document.createElement("span");
            const cx = cartRect.left + cartRect.width / 2;
            const cy = cartRect.top + cartRect.height / 2;
            const rSize = 14;
            ripple.style.position = "fixed";
            ripple.style.left = `${cx - rSize}px`;
            ripple.style.top = `${cy - rSize}px`;
            ripple.style.width = `${rSize * 2}px`;
            ripple.style.height = `${rSize * 2}px`;
            ripple.style.border = `2px solid ${color}`;
            ripple.style.borderRadius = "9999px";
            ripple.style.opacity = "0.5";
            ripple.style.pointerEvents = "none";
            ripple.style.zIndex = "9999";
            ripple.style.transform = "scale(0.4)";
            ripple.style.transition = "transform 420ms ease, opacity 420ms ease";
            document.body.appendChild(ripple);
            requestAnimationFrame(() => {
              ripple.style.transform = "scale(1.8)";
              ripple.style.opacity = "0";
            });
            setTimeout(() => ripple.remove(), 460);

            // Cleanup flying image
            if (flying && flying.parentNode) flying.parentNode.removeChild(flying);
          };
          flying.addEventListener("transitionend", onArrive);
        };
        flying.addEventListener("transitionend", onPhase1End);
      } catch (_e) {
        // no-op if animation fails
      }
    }
  

  const incrementQty = () => setQty((q) => Math.min(99, q + 1));
  const decrementQty = () => setQty((q) => Math.max(1, q - 1));

  // Filter for dropdown
  const filteredVariants = useMemo(() => {
    const q = variantSearch.trim().toLowerCase();
    if (!q) return allVariants;
    return allVariants.filter((v: any) => {
      const name = v.name?.toLowerCase() || "";
      const sku = (v as any).sku?.toLowerCase() || "";
      return name.includes(q) || sku.includes(q);
    });
  }, [allVariants, variantSearch]);

  const rawAttachment = product?.product?.attachmentUrl;
  const producturl = rawAttachment ? `${import.meta.env.VITE_BACKEND_URL}${rawAttachment}` : "";
  return (
    <article className="group rounded-md border border-border/60 bg-card text-card-foreground overflow-hidden shadow-sm hover:shadow-md hover:border-border transition-all duration-200 h-full flex flex-col">
      {/* Product Image with Link */}
      <Link
        to={`/snf/product/${product.product.id}`}
        className="block relative aspect-square min-h-[88px] sm:min-h-[96px] bg-muted/30 overflow-hidden"
      >
        <img
          ref={imgRef}
          src={
            producturl && producturl.trim().length > 0
              ? producturl
              : `https://images.unsplash.com/photo-1546470427-0fd2788c37e3?auto=format&fit=crop&w=400&q=80`
          }
          alt={product.product.name}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
        />
        {showVariants && discount > 0 && (
          <div className="absolute left-2 top-2 rounded-full bg-destructive/90 text-white text-xs px-2.5 py-1 shadow-sm font-medium">
            -{Math.round(discount * 100)}%
          </div>
        )}
        {isOutOfStock && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            <span className="bg-white/90 text-foreground px-3 py-1.5 rounded-md font-medium text-sm">Out of Stock</span>
          </div>
        )}
      </Link>

      <div className="p-2 md:p-2.5 space-y-2 md:space-y-2.5 flex-1 flex flex-col">
        {/* Product Name */}
        <h3 className="font-semibold text-[12px] md:text-[13px] leading-tight line-clamp-1 min-h-[1.25rem]">
          <Link to={`/snf/product/${product.product.id}`} className="hover:text-primary transition-colors">
            {product.product.name}
          </Link>
        </h3>

        {/* Variant UX */}
        {hasMultipleVariants && (
          <>
            {showPills ? (
              // Show variant pills directly (<= threshold)
              <div className="flex flex-wrap gap-1 md:gap-1.5">
                {allVariants.map((variant: any) => {
                  const variantPrice = variant.buyOncePrice || variant.mrp || 0;
                  const isSelected = variant.id === selectedVariant?.id;
                  const isAvailable =
                    !variant.isHidden && !variant.notInStock;

                  return (
                    <button
                      key={variant.id}
                      onClick={() => handleVariantSelect(variant.id)}
                      disabled={!isAvailable}
                      className={[
                        "inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[11px] transition-colors",
                        isSelected ? "bg-primary/10 border-primary text-primary" : "hover:bg-accent",
                        !isAvailable ? "opacity-50 cursor-not-allowed" : "",
                      ].join(" ")}
                      aria-pressed={isSelected}
                    >
                      <span className="font-medium">{variant.name}</span>
                      <span className="text-muted-foreground">₹{variantPrice.toFixed(0)}</span>
                      {!isAvailable && <span className="text-muted-foreground">(OOS)</span>}
                    </button>
                  );
                })}
              </div>
            ) : (
              // More than threshold: show a compact selector with search
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setIsVariantDropdownOpen((o) => !o)}
                  className="w-full flex items-center justify-between px-2 py-1.5 border rounded-md text-[13px] hover:bg-accent transition-colors"
                  aria-expanded={isVariantDropdownOpen}
                >
                  <span className="flex items-center gap-2">
                    <span className="font-medium">{selectedVariant ? selectedVariant.name : "Select variant"}</span>
                    {selectedVariant && displayPrice > 0 && (
                      <span className="text-muted-foreground">₹{displayPrice.toFixed(2)}</span>
                    )}
                  </span>
                  <ChevronDown className={`h-4 w-4 transition-transform ${isVariantDropdownOpen ? "rotate-180" : ""}`} />
                </button>

                {isVariantDropdownOpen && (
                  <div className="absolute z-20 w-full mt-1 bg-popover border rounded-md shadow-lg overflow-hidden">
                    {/* Search bar */}
                    <div className="flex items-center gap-1.5 p-1.5 border-b bg-background">
                      <Search className="h-4 w-4 text-muted-foreground" />
                      <input
                        value={variantSearch}
                        onChange={(e) => setVariantSearch(e.target.value)}
                        placeholder="Search variant..."
                        className="w-full bg-transparent text-sm outline-none"
                      />
                      {variantSearch && (
                        <button
                          className="p-1 rounded hover:bg-accent"
                          onClick={() => setVariantSearch("")}
                          aria-label="Clear search"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>

                    <div className="max-h-48 overflow-y-auto">
                      {filteredVariants.length === 0 ? (
                        <div className="p-3 text-sm text-muted-foreground">No variants found</div>
                      ) : (
                        filteredVariants.map((variant) => {
                          const variantPrice = variant.buyOncePrice || variant.mrp || 0;
                          const isSelected = variant.id === selectedVariant?.id;
                          const isAvailable =
                            !variant.isHidden &&
                            !variant.notInStock &&
                            (variant.closingQty === undefined || variant.closingQty > 0);

                          const lowStock =
                            variant.closingQty !== undefined && variant.closingQty > 0 && variant.closingQty <= 10;

                          return (
                            <button
                              key={variant.id}
                              onClick={() => handleVariantSelect(variant.id)}
                              disabled={!isAvailable}
                              className={[
                                "w-full px-2 py-1.5 text-left hover:bg-accent transition-colors flex items-center justify-between",
                                !isAvailable ? "opacity-50 cursor-not-allowed" : "",
                                isSelected ? "bg-accent" : "",
                              ].join(" ")}
                            >
                              <div className="flex flex-col gap-0.5">
                                <span className="font-medium text-sm">{variant.name}</span>
                                <span className="text-xs text-muted-foreground">
                                  {lowStock ? `Only ${variant.closingQty} left` : isAvailable ? "In Stock" : "Out of stock"}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-semibold">₹{variantPrice.toFixed(2)}</span>
                                {isSelected && <Check className="h-4 w-4 text-primary" />}
                              </div>
                            </button>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        

        {/* Price Display */}
        <div className="flex items-baseline gap-1">
          <span className="text-sm md:text-base font-semibold">₹{displayPrice > 0 ? displayPrice.toFixed(2) : "N/A"}</span>
          {showVariants && discount > 0 && mrpPrice > 0 && (
            <span className="text-xs md:text-sm text-muted-foreground line-through">₹{mrpPrice.toFixed(2)}</span>
          )}
        </div>

          {!isOutOfStock && (
            <div className="mt-auto flex items-stretch w-full relative z-10">
              <div className="flex items-center border rounded-md w-full overflow-hidden">
                <button
                  type="button"
                  className="px-2 py-1 hover:bg-accent disabled:opacity-50"
                  onClick={(e) => { e.stopPropagation(); e.preventDefault(); decrementQty(); }}
                  disabled={qty <= 1}
                  aria-label="Decrease quantity"
                >
                  <Minus className="h-3 w-3" />
                </button>
                <div className="flex-1 min-w-0 text-center text-[12px] md:text-sm font-medium select-none py-1">
                  {qty}
                </div>
                <button
                  type="button"
                  className="px-2 py-1 hover:bg-accent disabled:opacity-50"
                  onClick={(e) => { e.stopPropagation(); e.preventDefault(); incrementQty(); }}
                  aria-label="Increase quantity"
                  disabled={
                    selectedVariant?.closingQty != null && selectedVariant.closingQty > 0
                      ? qty >= selectedVariant.closingQty
                      : false
                  }
                >
                  <Plus className="h-3 w-3" />
                </button>
              </div>
            </div>
          )}


        {/* Action Row */}
        <div className="flex items-center gap-1 pt-1 mt-1">
          {/* Optional quantity stepper (hide if OOS) */}
          
          <Button
            ref={addBtnRef}
            className="flex-1 h-7 text-[12px]"
            onClick={handleAddToCart}
            disabled={isOutOfStock}
            variant={isOutOfStock ? "outline" : "default"}
          >
            {isOutOfStock ? "Notify Me" : "Add to Cart"}
          </Button>
 
        </div>
      </div>
    </article>
  )
};