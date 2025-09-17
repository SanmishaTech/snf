import React, { useMemo, useState, useEffect } from "react";
// Use explicit file extensions to satisfy TS module resolution in Vite/TS strict setups
import { Header } from "./components/Header.tsx";
import { Footer } from "./components/Footer.tsx";
import { Hero } from "./components/Hero.tsx";
import { ProductGrid } from "./components/ProductGrid.tsx";
import { usePricing } from "./context/PricingContext.tsx";
import { useLocation, useNavigate } from "react-router-dom";
// import { geolocationService } from "./services/geolocation";
import { ProductWithPricing, DepotVariant } from "./types";
import { productService } from "./services/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCart } from "./context/CartContext";
import { useDeliveryLocation } from "./hooks/useDeliveryLocation";
import type { Category as FilterCategory } from "./components/CategoryFilters.tsx";
import AnimatedCategoryNav from "./components/AnimatedCategoryNav.tsx";

export type SortKey = "relevance" | "price_asc" | "price_desc" | "popularity_desc";

const SNFContent: React.FC = () => {
  const [q, setQ] = useState("");
  const [selectedCats, setSelectedCats] = useState<number[]>([]);
  const [sort] = useState<SortKey>("relevance");
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const location = useLocation();
  const navigate = useNavigate();

  // CategoryFilters expects ids as string; keep a lightweight shape for filters
  const [categories, setCategories] = useState<FilterCategory[]>([]);
  const [catLoading, setCatLoading] = useState<boolean>(false);
  const [catError, setCatError] = useState<string | null>(null);

  const { state: pricingState, actions: pricingActions } = usePricing();
  const { addItem, state: cartState } = useCart();
  const { currentDepotId } = useDeliveryLocation();

  // Use pricing context data directly instead of individual hooks
  // const location = pricingState.userLocation;
  console.log('=== PRODUCT TRANSFORMATION DEBUG ===');
  console.log('pricingState.products:', pricingState.products);
  console.log('pricingState.depotVariants:', pricingState.depotVariants);
  
  const products = pricingState.products.map(product => {
    const productVariants = pricingState.depotVariants.filter(v => v.productId === product.id);
    console.log(`Product ${product.id} (${product.name}) has ${productVariants.length} variants:`, productVariants);
    
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
      variants: productVariants, // may be empty for products without variants; still display
      buyOncePrice,
      mrp,
      inStock,
      deliveryTime: 'Same day delivery'
    };
  });
  const isLoading = pricingState.isLoading;
  // const error = pricingState.error;

  // Fetch categories from API for landing grid
  useEffect(() => {
    const fetchCategories = async () => {
      setCatLoading(true);
      setCatError(null);
      try {
        const data = await productService.getCategories();
        console.log('Fetched categories:', data);
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
            city: '',
            isOnline: true,
          };
          
          await pricingActions.setDepot(depot);
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

  // Log when products are refetched due to location/depot changes
  useEffect(() => {
    if (pricingState.currentDepot) {
      console.log(`Products loaded for depot: ${pricingState.currentDepot.name} (${pricingState.currentDepot.id})`);
      console.log(`Total products: ${pricingState.products.length}, Total variants: ${pricingState.depotVariants.length}`);
      console.log('Raw products from API:', pricingState.products);
      console.log('Raw depot variants from API:', pricingState.depotVariants);
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
      // Do NOT auto-scroll when selecting a category from the top bar
      return;
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
    // Apply search query filter
    console.log(`Filter display ${filteredProducts.length} products with query "${q}"`);
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
    console.log(`Filtered ${filteredProducts.length} products, sorted by ${sort}`);
    console.log(`Final product count: ${sorted.length}`);

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
      <Header cartCount={cartState.items.reduce((n, it) => n + it.quantity, 0)} onSearch={setQ} blendWithCategoryBar />

      {/* Animated category nav bridging header and hero - Mobile only */}
      <div className="block md:hidden">
        <AnimatedCategoryNav
          categories={categories.map((c: any) => ({
            id: Number(c.id),
            name: c.name,
            imageUrl: (c as any).imageUrl,
          }))}
          selectedId={selectedCats.length > 0 ? selectedCats[0] : null}
          onSelect={(id) => {
            if (id === null) {
              setSelectedCats([]);
              navigate('/snf', { replace: false });
            } else {
              setSelectedCats([id]);
              navigate(`/snf?tag=category:${id}`, { replace: false });
            }
          }}
        />
      </div>

      <main className="flex-1">
        <Hero />

        {/* Categories Grid - fetched from API, 6 columns per row on large screens - Desktop only */}
        <section className="hidden md:block container mx-auto px-4 md:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl md:text-2xl font-semibold">Browse by Category</h2>
            {catError && (
              <Button size="sm" variant="outline" onClick={() => {
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
              }}>
                Retry
              </Button>
            )}
          </div>

          {catLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="aspect-square w-full rounded-lg bg-muted/30" />
                  <div className="h-3 w-2/3 bg-muted/40 rounded mt-3" />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-4">
              {/* All category to clear filters */}
              

              {categories.map((cat: any) => {
                const catIdNum = parseInt(cat.id, 10);
                const isSelected = selectedCats.includes(catIdNum);
                return (
                  <a
                    key={cat.id}
                    id={`category-${catIdNum}`}
                    href={`/snf?tag=category:${catIdNum}`}
                    className="group text-left max-w-[10rem]"
                    aria-label={`Filter by category ${cat.name}`}
                  >
                    <div className={`relative aspect-square w-full overflow-hidden rounded-full  border bg-accent/10 ${isSelected ? 'ring-2 ring-primary border-primary' : ''}`}>
                      {cat.imageUrl ? (
                        <img
                          src={`${import.meta.env.VITE_BACKEND_URL}${cat.imageUrl}`}
                          alt={cat.name}
                          className=" h-full w-full  object-cover rounded-full transition-transform duration-300 group-hover:scale-[1.03]"
                          loading="lazy"
                        />
                      ) : (
                        <div className="h-full w-full grid place-items-center text-muted-foreground bg-gradient-to-br from-muted/30 to-transparent rounded-full">
                          {cat.name?.charAt(0) || "C"}
                        </div>
                      )}
                    </div>
                    <div className="mt-3 text-center">
                      <p className={`text-sm font-medium line-clamp-2 transition-colors ${isSelected ? 'text-primary' : 'group-hover:text-primary'}`}>
                        {cat.name}
                      </p>
                    </div>
                  </a>
                );
              })}
              {categories.length === 0 && !catError && (
                <p className="col-span-2 sm:col-span-3 lg:col-span-6 text-muted-foreground">
                  No categories available.
                </p>
              )}
            </div>
          )}
        </section>

        {/* Separation heading between Categories and Products */}
        <section className="container mx-auto px-4 md:px-6 lg:px-8">
          <div className="h-px w-full bg-border/60" />
          <div className="flex items-end justify-between py-4">
            <div>
              <h2 className="text-xl md:text-2xl font-semibold">Products</h2>
              <p className="text-sm text-muted-foreground">
                Click a category above to filter products below
              </p>
            </div>
          </div>
        </section>

        {/* Product filters + grid */}
        <section id="products" className="container mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-6">
          {/* Local search input for products */}
          <div className="mb-4">
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search products"
              aria-label="Search products"
            />
          </div>

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
          ) : (
            <div className="">
              <ProductGrid
                products={filtered}
                onAddToCart={onAddToCart}
                isLoading={isLoading}
              />
            </div>
          )}
        </section>
      </main>

      <Footer />
    </div>
  );
};

const SNFLandingPage: React.FC = () => {
  return (
    <SNFContent />
  );
};

export default SNFLandingPage;