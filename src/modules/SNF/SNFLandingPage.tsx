import React, { useMemo, useState, useEffect } from "react";
// Use explicit file extensions to satisfy TS module resolution in Vite/TS strict setups
import { Header } from "./components/Header.tsx";
import { Footer } from "./components/Footer.tsx";
import { Hero } from "./components/Hero.tsx";
import { ProductGrid } from "./components/ProductGrid.tsx";
import { ProductCard } from "./components/ProductCard.tsx";
import { MobileBottomNav } from "./components/MobileBottomNav.tsx";
import { usePricing } from "./context/PricingContext.tsx";
import { useLocation, useNavigate } from "react-router-dom";
// import { geolocationService } from "./services/geolocation";
import { ProductWithPricing, DepotVariant } from "./types";
import { productService } from "./services/api";
import { Button } from "@/components/ui/button";
import { useCart } from "./context/CartContext";
import { useDeliveryLocation } from "./hooks/useDeliveryLocation";
import type { Category as FilterCategory } from "./components/CategoryFilters.tsx";
import { CategoryBar } from "./components/CategoryBar.tsx";
import { useTransition } from "react";

export type SortKey = "relevance" | "price_asc" | "price_desc" | "popularity_desc";

const SNFContent: React.FC = () => {
  const [q, setQ] = useState("");
  const [selectedCats, setSelectedCats] = useState<number[]>([]);
  const [sort] = useState<SortKey>("relevance");
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const location = useLocation();
  const navigate = useNavigate();
  // Scroll state managed in CategoryBar component

  // CategoryFilters expects ids as string; keep a lightweight shape for filters
  const [categories, setCategories] = useState<FilterCategory[]>([]);
  const [catLoading, setCatLoading] = useState<boolean>(false);
  const [catError, setCatError] = useState<string | null>(null);

  // Category scroll checking now handled inside CategoryBar

  const { state: pricingState, actions: pricingActions } = usePricing();
  const { addItem, state: cartState } = useCart();
  const { currentDepotId } = useDeliveryLocation();
  const { hasMore } = pricingState;
  const { loadMoreProducts } = pricingActions;

  // Use pricing context data directly instead of individual hooks
  // const location = pricingState.userLocation;
  // Memoize products mapping to avoid re-creation on every render
  const products = useMemo(() => {
    return pricingState.products.map(product => {
      const productVariants = pricingState.depotVariants.filter(v => v.productId === product.id);

      // Calculate buyOncePrice only from available variants
      const availableVariants = productVariants.filter(v => !v.notInStock && !v.isHidden);
      const buyOncePrices = availableVariants.map(v => {
        const price = v.buyOncePrice || v.mrp || 0;
        return typeof price === 'number' && isFinite(price) && price > 0 ? price : 0;
      }).filter(price => price > 0);

      const buyOncePrice = buyOncePrices.length > 0 ? Math.min(...buyOncePrices) : 0;
      const inStock = availableVariants.length > 0;
      const mrpPrices = availableVariants.map(v => {
        const price = v.mrp || 0;
        return typeof price === 'number' && isFinite(price) && price > 0 ? price : 0;
      }).filter(price => price > 0);
      const mrp = mrpPrices.length > 0 ? Math.max(...mrpPrices) : 0;

      return {
        product,
        variants: productVariants,
        buyOncePrice,
        mrp,
        inStock,
        deliveryTime: 'Same day delivery'
      };
    });
  }, [pricingState.products, pricingState.depotVariants]);
  const isLoading = pricingState.isLoading;
  // const error = pricingState.error;

  // Fetch categories from API for landing grid
  useEffect(() => {
    const fetchCategories = async () => {
      setCatLoading(true);
      setCatError(null);
      try {
        const data = await productService.getCategories();
        // Normalize fields for display: id, name, imageUrl (if present in API)
        const normalized: (FilterCategory & { imageUrl?: string })[] = (Array.isArray(data) ? data : []).map((c: any) => ({
          id: String(c.id ?? c._id ?? c.slug ?? ""),
          name: c.name || c.title || "Category",
          imageUrl: c.imageUrl || c.attachmentUrl || c.iconUrl || c.url || undefined,
        }));
        // Keep "Milk" category first
        const sortedCats = [...normalized].sort((a, b) => {
          const aMilk = typeof a.name === "string" && a.name.toLowerCase().includes("milk") ? 1 : 0;
          const bMilk = typeof b.name === "string" && b.name.toLowerCase().includes("milk") ? 1 : 0;
          if (aMilk !== bMilk) return bMilk - aMilk;
          return (a.name || "").localeCompare(b.name || "");
        });
        setCategories(sortedCats as FilterCategory[]);
      } catch (e: any) {
        setCatError(e?.message || "Failed to load categories");
      } finally {
        setCatLoading(false);
      }
    };
    fetchCategories();
  }, []);

  // Load products when depot changes
  useEffect(() => {
    const loadProductsForDepot = async () => {
      if (currentDepotId && (!pricingState.currentDepot || pricingState.currentDepot.id !== currentDepotId)) {
        try {
          // Create a depot object for the pricing context
          const depot = {
            id: currentDepotId,
            name: `Depot ${currentDepotId}`,
            address: '',
            pincode: '',
            city: '',
            isOnline: true,
            isActive: true,
          };

          await pricingActions.setDepot(depot as any);
        } catch (error) {
          console.error('Failed to load products for depot:', error);
        }
      }
    };

    loadProductsForDepot();
  }, [currentDepotId, pricingState.currentDepot, pricingActions]);

  // Show pincode entry if PricingContext failed to get location
  useEffect(() => {
    if (!pricingState.userLocation && !pricingState.isLoading) {
      // Optionally, you may surface a pincode prompt here
    }
  }, [pricingState.userLocation, pricingState.isLoading]);

  useEffect(() => {
    if (pricingState.currentDepot) {
      // Products loaded
    }
  }, [pricingState.currentDepot, pricingState.products.length, pricingState.depotVariants.length]);

  // Handle hash navigation for anchors like #products or #category-<id>
  useEffect(() => {
    // When categories finish loading, attempt to scroll/select based on hash
    const hash = (location.hash || "").replace('#', '');
    if (!hash) return;
    // If category anchor, preselect that category
    if (hash.startsWith('category-')) {
      const idStr = hash.slice('category-'.length);
      const idNum = parseInt(idStr, 10);
      if (Number.isFinite(idNum)) {
        setSelectedCats([idNum]);
      }
    }
    // Defer scroll to ensure elements are in DOM
    const tryScroll = () => {
      const el = document.getElementById(hash);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };
    // Try now and again after a tick (for async category load)
    tryScroll();
    const t = setTimeout(tryScroll, 150);
    return () => clearTimeout(t);
  }, [location.hash, catLoading, categories.length]);

  // Handle tag-based filters via query param ?tag=
  useEffect(() => {
    const params = new URLSearchParams(location.search || "");
    const tagRaw = params.get('tag');
    if (!tagRaw) {
      setSelectedTag(null);
      return;
    }
    const tag = tagRaw.toLowerCase().trim();
    if (tag.startsWith('category:')) {
      const idStr = tag.split(':')[1];
      const idNum = parseInt(idStr || '', 10);
      if (Number.isFinite(idNum)) {
        setSelectedCats([idNum]);
      }
      setSelectedTag(null);
    } else {
      // Keep the exact tag (lowercased). Matching logic will handle common misspellings.
      setSelectedTag(tag);
    }
    // Smooth scroll to products section when tag present
    const scroll = () => {
      const el = document.getElementById('products');
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };
    scroll();
    const t = setTimeout(scroll, 120);
    return () => clearTimeout(t);
  }, [location.search]);

  // Extract error types
  // const locationError = pricingState.error && pricingState.error.type === 'PERMISSION_DENIED' ? pricingState.error : null;
  // const depotError = pricingState.error && pricingState.error.type === 'DEPOT_NOT_FOUND' ? pricingState.error : null;

  // Handle manual pincode entry
  // const handlePincodeSubmit = async (pincode: string) => {
  //   try {
  //     const loc = await geolocationService.getPositionFromPincode(pincode);
  //     await pricingActions.setLocation(loc);
  //   } catch (error) {
  //     console.error('Error setting pincode:', error);
  //     pricingActions.setError(error as any);
  //   }
  // };

  // Handle location request
  // const handleLocationRequest = async () => {
  //   try {
  //     const loc = await geolocationService.requestLocationWithExplanation();
  //     await pricingActions.setLocation(loc);
  //   } catch (error) {
  //     console.error('Error requesting location:', error);
  //     pricingActions.setError(error as any);
  //   }
  // };

  // Filter and sort products
  const filtered = useMemo(() => {
    let filteredProducts = products;

    if (q.trim()) {
      const term = q.trim().toLowerCase();
      filteredProducts = filteredProducts.filter(p =>
        p.product.name.toLowerCase().includes(term) ||
        (p.product.description ? p.product.description.toLowerCase().includes(term) : false)
      );
    }

    if (selectedCats.length > 0) {
      filteredProducts = filteredProducts.filter(p =>
        selectedCats.includes(p.product.categoryId || 0)
      );
    }

    // Apply tag filters: non-dairy, contains-dairy, or arbitrary backend tags
    if (selectedTag) {
      if (selectedTag === 'non-dairy') {
        filteredProducts = filteredProducts.filter(p => !p.product.isDairyProduct);
      } else if (selectedTag === 'contains-dairy') {
        filteredProducts = filteredProducts.filter(p => !!p.product.isDairyProduct);
      } else {
        // Arbitrary tag filter from backend comma-separated tags
        const wanted = selectedTag.toLowerCase().trim();
        filteredProducts = filteredProducts.filter(p => {
          const raw = (p.product as any).tags as string | undefined;
          if (!raw) return false;
          const list = raw.split(',').map(t => t.trim().toLowerCase()).filter(Boolean);
          // Support both 'pasteurized' and 'pasturized' regardless of which is requested
          if (wanted === 'pasteurized' || wanted === 'pasturized') {
            return list.includes('pasteurized') || list.includes('pasturized');
          }
          return list.includes(wanted);
        });
      }
    }

    const sorted = [...filteredProducts];
    switch (sort) {
      case "price_asc":
        sorted.sort((a, b) => a.buyOncePrice - b.buyOncePrice);
        break;
      case "price_desc":
        sorted.sort((a, b) => b.buyOncePrice - a.buyOncePrice);
        break;
      case "popularity_desc":
        sorted.sort((a, b) => (b.product.id || 0) - (a.product.id || 0));
        break;
      case "relevance":
      default:
        sorted.sort((a, b) => {
          if (a.buyOncePrice !== b.buyOncePrice) return a.buyOncePrice - b.buyOncePrice;
          return (a.product.id || 0) - (b.product.id || 0);
        });
        break;
    }

    return sorted;
  }, [products, q, selectedCats, sort, selectedTag]);

  // const onToggleCategory = (id: string) => {
  //   setSelectedCats((prev) => {
  //     const categoryId = parseInt(id);
  //     if (prev.includes(categoryId)) {
  //       return prev.filter((x) => x !== categoryId);
  //     } else {
  //       return [...prev, categoryId];
  //     }
  //   });
  // };

  const onAddToCart = (product: ProductWithPricing, variant?: DepotVariant, qty?: number) => {
    if (!variant) return;
    addItem(product, variant, qty || 1);
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header cartCount={cartState.items.reduce((n, it) => n + it.quantity, 0)} onSearch={setQ} />

      <main className="flex-1 pt-[env(safe-area-inset-top)] md:pt-16">
        <Hero />

        {/* Categories Grid - horizontal scrollable tab row */}
        <section id="all-types" className={`container mx-auto px-4 md:px-6 lg:px-8 py-6 transition-opacity duration-200 ${isPending ? 'opacity-70' : 'opacity-100'}`}>
          <CategoryBar
            categories={categories}
            selectedCats={selectedCats}
            isLoading={catLoading}
            error={catError}
            onSelectCategory={(id) => {
              startTransition(() => {
                setSelectedCats([id]);
              });
            }}
            onSelectAll={() => {
              startTransition(() => {
                setSelectedCats([]);
                setSelectedTag(null);
                const params = new URLSearchParams(location.search || "");
                params.delete("tag");
                navigate({ search: params.toString() ? `?${params.toString()}` : "" }, { replace: true });
              });
            }}
            onRetry={() => {
              setCatLoading(true);
              productService.getCategories()
                .then((data) => {
                  const normalized: (FilterCategory & { imageUrl?: string })[] = (Array.isArray(data) ? data : []).map((c: any) => ({
                    id: String(c.id ?? c._id ?? c.slug ?? ""),
                    name: c.name || c.title || "Category",
                    imageUrl: c.imageUrl || c.attachmentUrl || c.iconUrl || c.url || undefined,
                  }));
                  const sortedCats = [...normalized].sort((a, b) => {
                    const aMilk = typeof a.name === "string" && a.name.toLowerCase().includes("milk") ? 1 : 0;
                    const bMilk = typeof b.name === "string" && b.name.toLowerCase().includes("milk") ? 1 : 0;
                    if (aMilk !== bMilk) return bMilk - aMilk;
                    return (a.name || "").localeCompare(b.name || "");
                  });
                  setCategories(sortedCats as FilterCategory[]);
                  setCatError(null);
                })
                .catch((e: any) => setCatError(e?.message || "Failed to load categories"))
                .finally(() => setCatLoading(false));
            }}
          />
        </section>

        {/* Product filters + grid */}
        <section id="products" className="container mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-6">
          {isLoading && products.length === 0 ? (
            <div className="mt-6">
              {/* basic skeletons */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="animate-pulse">
                    <div className="aspect-[4/3] w-full rounded-lg bg-muted/30" />
                    <div className="h-3 w-3/4 bg-muted/40 rounded mt-3" />
                  </div>
                ))}
              </div>
            </div>
          ) : q.trim() || selectedTag || selectedCats.length > 0 ? (
            <div className="">
              <ProductGrid
                products={filtered}
                onAddToCart={onAddToCart}
                isLoading={isLoading}
              />
              {hasMore && filtered.length > 0 && (
                <div className="mt-8 flex justify-center pb-10">
                  <Button
                    onClick={loadMoreProducts}
                    disabled={isLoading}
                    variant="outline"
                    size="lg"
                    className="min-w-[200px] border-primary text-primary hover:bg-primary/5 h-12"
                  >
                    {isLoading ? (
                      <div className="flex items-center gap-2">
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                        Loading...
                      </div>
                    ) : (
                      'Load More Products'
                    )}
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-8 mt-4">
              {categories.map((cat: any) => {
                const catProducts = filtered.filter(p => p.product.categoryId === parseInt(cat.id));
                if (catProducts.length === 0) return null;
                return (
                  <div key={cat.id} className="pt-2">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg md:text-xl font-bold">{cat.name}</h3>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedCats([parseInt(cat.id)]);
                          document.getElementById('products')?.scrollIntoView({ behavior: 'smooth' });
                        }}
                        className="text-sm font-medium text-primary hover:underline cursor-pointer"
                      >
                        See all
                      </button>
                    </div>
                    <div className="flex overflow-x-auto gap-3 sm:gap-4 scrollbar-hide snap-x pb-4 px-1">
                      {catProducts.map(p => (
                        <div key={p.product.id} className="flex-shrink-0 w-[140px] sm:w-[160px] md:w-[180px] snap-start h-auto flex">
                          <ProductCard product={p} onAddToCart={onAddToCart} showVariants={true} />
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}

              {/* Render any uncategorized products */}
              {(() => {
                const uncategorized = filtered.filter(p => !categories.find((c: any) => parseInt(c.id) === p.product.categoryId));
                if (uncategorized.length === 0) return null;
                return (
                  <div className="pt-2">
                    <h3 className="text-lg md:text-xl font-bold mb-4">Other Products</h3>
                    <div className="flex overflow-x-auto gap-3 sm:gap-4 scrollbar-hide snap-x pb-4 px-1">
                      {uncategorized.map(p => (
                        <div key={p.product.id} className="flex-shrink-0 w-[140px] sm:w-[160px] md:w-[180px] snap-start h-auto flex">
                          <ProductCard product={p} onAddToCart={onAddToCart} showVariants={true} />
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
        </section>
      </main>

      <Footer />
      <MobileBottomNav />
    </div>
  );
};

const SNFLandingPage: React.FC = () => {
  return (
    <SNFContent />
  );
};

export default SNFLandingPage;