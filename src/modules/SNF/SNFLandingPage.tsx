import React, { useMemo, useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Header } from "./components/Header.tsx";
import { Footer } from "./components/Footer.tsx";
import { Hero } from "./components/Hero.tsx";
import { ProductGrid } from "./components/ProductGrid.tsx";
import { ProductCard } from "./components/ProductCard.tsx";
import { MobileBottomNav } from "./components/MobileBottomNav.tsx";
import { usePricing } from "./context/PricingContext.tsx";
import { useLocation, useNavigate } from "react-router-dom";
import { ProductWithPricing, DepotVariant } from "./types";
import { productService } from "./services/api";
import { Button } from "@/components/ui/button";
import { AnimatePresence } from "framer-motion";
import { useCart } from "./context/CartContext";
import { useDeliveryLocation } from "./hooks/useDeliveryLocation";
import { CategoryBar } from "./components/CategoryBar.tsx";
import { useTransition, useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Category as FilterCategory } from "./components/CategoryFilters.tsx";
import { useSNFProducts } from "./hooks/useSNFProducts";

export type SortKey = "relevance" | "price_asc" | "price_desc" | "popularity_desc";

const SNFContent: React.FC = () => {
  const [q, setQ] = useState("");
  const [selectedCats, setSelectedCats] = useState<number[]>([]);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const location = useLocation();
  const navigate = useNavigate();

  const [categories, setCategories] = useState<FilterCategory[]>([]);
  const [catLoading, setCatLoading] = useState<boolean>(false);
  const [catError, setCatError] = useState<string | null>(null);

  const { state: pricingState, actions: pricingActions } = usePricing();
  const { addItem, state: cartState } = useCart();
  const { currentDepotId } = useDeliveryLocation();

  const [canScrollLeftTags, setCanScrollLeftTags] = useState(false);
  const [canScrollRightTags, setCanScrollRightTags] = useState(false);
  const tagsScrollRef = useRef<HTMLDivElement>(null);

  const selectedCatId = selectedCats.length > 0 ? selectedCats[0] : undefined;

  // Centralized TanStack Infinite Query for Product Fetching
  const {
    data: infiniteData,
    fetchNextPage,
    hasNextPage,
    isLoading: isProductsLoading,
    isFetchingNextPage,
  } = useSNFProducts({
    depotId: currentDepotId,
    categoryId: selectedCatId,
    tags: selectedTag || undefined,
    search: q || undefined
  });

  // Intersection Observer for Infinite Scroll
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadingRef = React.useCallback((node: HTMLDivElement | null) => {
    if (isProductsLoading || isFetchingNextPage) return;
    if (observerRef.current) observerRef.current.disconnect();

    observerRef.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
        fetchNextPage();
      }
    }, {
      rootMargin: '400px',
    });

    if (node) observerRef.current.observe(node);
  }, [isProductsLoading, isFetchingNextPage, hasNextPage, fetchNextPage]);

  const products = useMemo(() => {
    const allFetchedProducts = infiniteData?.pages.flatMap(page => page.products) || [];

    return allFetchedProducts.map(product => {
      const productVariants = pricingState.depotVariants.filter(v => v.productId === product.id);
      const availableVariants = productVariants.filter(v => !v.notInStock && !v.isHidden);
      const buyOncePrices = availableVariants.map(v => v.buyOncePrice || v.mrp || 0).filter(p => p > 0);
      const buyOncePrice = buyOncePrices.length > 0 ? Math.min(...buyOncePrices) : 0;
      const inStock = availableVariants.length > 0;
      const mrpPrices = availableVariants.map(v => v.mrp || 0).filter(p => p > 0);
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
  }, [infiniteData, pricingState.depotVariants]);

  const isLoading = isProductsLoading;

  useEffect(() => {
    const fetchCategories = async () => {
      setCatLoading(true);
      try {
        const data = await productService.getCategories();
        const normalized: (FilterCategory & { imageUrl?: string })[] = (Array.isArray(data) ? data : []).map((c: any) => ({
          id: String(c.id ?? ""),
          name: c.name || "Category",
          imageUrl: c.imageUrl || c.attachmentUrl || undefined,
        }));
        const sortedCats = [...normalized].sort((a, b) => {
          const aMilk = a.name.toLowerCase().includes("milk") ? 1 : 0;
          const bMilk = b.name.toLowerCase().includes("milk") ? 1 : 0;
          if (aMilk !== bMilk) return bMilk - aMilk;
          return a.name.localeCompare(b.name);
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

  useEffect(() => {
    if (currentDepotId && (!pricingState.currentDepot || pricingState.currentDepot.id !== currentDepotId)) {
      pricingActions.setDepot({ id: currentDepotId, name: `Depot ${currentDepotId}`, isOnline: true } as any);
    }
  }, [currentDepotId, pricingState.currentDepot, pricingActions]);

  useEffect(() => {
    const hash = (location.hash || "").replace('#', '');
    if (!hash) return;
    if (hash.startsWith('category-')) {
      const idNum = parseInt(hash.slice('category-'.length), 10);
      if (Number.isFinite(idNum)) setSelectedCats([idNum]);
    }
    setTimeout(() => {
      document.getElementById(hash)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 150);
  }, [location.hash, categories.length]);

  useEffect(() => {
    const params = new URLSearchParams(location.search || "");
    const tagRaw = params.get('tag');
    if (!tagRaw) {
      setSelectedTag(null);
      return;
    }
    const tag = tagRaw.toLowerCase().trim();
    if (tag.startsWith('category:')) {
      const idNum = parseInt(tag.split(':')[1] || '', 10);
      if (Number.isFinite(idNum)) setSelectedCats([idNum]);
      setSelectedTag(null);
    } else {
      setSelectedTag(tag);
    }
    setTimeout(() => {
      document.getElementById('products')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 120);
  }, [location.search]);

  const categoryRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const scrollCategory = (catId: string, direction: 'left' | 'right') => {
    const el = categoryRefs.current[catId];
    if (el) el.scrollBy({ left: direction === 'left' ? -320 : 320, behavior: 'smooth' });
  };

  const allTags = useMemo(() => {
    const tags = new Set<string>();
    products.forEach(p => {
      const raw = (p.product as any).tags as string | undefined;
      if (raw) raw.split(',').forEach(t => tags.add(t.trim().toLowerCase()));
    });
    return Array.from(tags).sort();
  }, [products]);

  const checkTagsScroll = useCallback(() => {
    const el = tagsScrollRef.current;
    if (!el) return;

    window.requestAnimationFrame(() => {
      const isLeftVisible = el.scrollLeft > 2;
      const isRightVisible = el.scrollLeft + el.clientWidth < el.scrollWidth - 5;

      setCanScrollLeftTags(isLeftVisible);
      setCanScrollRightTags(isRightVisible);
    });
  }, []);

  const scrollTags = (direction: 'left' | 'right') => {
    const el = tagsScrollRef.current;
    if (!el) return;
    const scrollAmount = direction === 'left' ? -200 : 200;
    el.scrollBy({ left: scrollAmount, behavior: 'smooth' });
  };

  useEffect(() => {
    if (allTags.length > 0) {
      const timer = setTimeout(checkTagsScroll, 100);
      window.addEventListener('resize', checkTagsScroll);
      return () => {
        clearTimeout(timer);
        window.removeEventListener('resize', checkTagsScroll);
      };
    }
  }, [allTags, checkTagsScroll]);

  const onToggleTag = (tag: string) => {
    startTransition(() => {
      const params = new URLSearchParams(location.search || "");
      if (selectedTag === tag) {
        setSelectedTag(null);
        params.delete("tag");
      } else {
        setSelectedTag(tag);
        params.set("tag", tag);
      }
      navigate({ search: params.toString() ? `?${params.toString()}` : "" }, { replace: true });
    });
  };

  const filtered = useMemo(() => [...products], [products]);

  const onAddToCart = (product: ProductWithPricing, variant?: DepotVariant, qty?: number) => {
    if (!variant) return;
    addItem(product, variant, qty || 1);
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header cartCount={cartState.items.reduce((n, it) => n + it.quantity, 0)} onSearch={setQ} />

      <main className="flex-1 pt-[env(safe-area-inset-top)] md:pt-16 flex flex-col">
        <Hero />

        <section id="all-types" className={`container mx-auto px-4 md:px-6 lg:px-8 py-6 transition-opacity duration-200 ${isPending ? 'opacity-70' : 'opacity-100'}`}>
          <CategoryBar
            categories={categories}
            selectedCats={selectedCats}
            isLoading={catLoading}
            error={catError}
            onSelectCategory={(id) => startTransition(() => setSelectedCats([id]))}
            onSelectAll={() => startTransition(() => {
              setSelectedCats([]);
              setSelectedTag(null);
              navigate({ search: "" }, { replace: true });
            })}
            onRetry={() => { }}
          />
        </section>

        {selectedCats.length === 0 && allTags.length > 0 && !catLoading && (
          <section className="container mx-auto px-4 md:px-6 lg:px-8 -mt-2 mb-4 relative group">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mr-1 shrink-0">Tags:</span>

              <div className="relative flex-1 overflow-hidden">
                <AnimatePresence>
                  {canScrollLeftTags && (
                    <div className="absolute left-0 top-0 bottom-0 flex items-center z-20 pointer-events-none pr-6">
                      <div className="absolute left-0 top-0 bottom-0 w-12 bg-gradient-to-r from-background via-background/90 to-transparent pointer-events-none" />
                      <button
                        type="button"
                        onClick={() => scrollTags('left')}
                        className="ml-1 h-7 w-7 flex items-center justify-center rounded-full bg-background border border-border shadow-sm text-foreground hover:text-primary hover:border-primary/30 hover:scale-110 transition-all duration-200 pointer-events-auto -translate-y-1.5"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </AnimatePresence>

                <AnimatePresence>
                  {canScrollRightTags && (
                    <div className="absolute right-0 top-0 bottom-0 flex items-center z-20 pointer-events-none pl-6">
                      <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-background via-background/90 to-transparent pointer-events-none" />
                      <button
                        type="button"
                        onClick={() => scrollTags('right')}
                        className="mr-1 h-7 w-7 flex items-center justify-center rounded-full bg-background border border-border shadow-sm text-foreground hover:text-primary hover:border-primary/30 hover:scale-110 transition-all duration-200 pointer-events-auto -translate-y-1.5"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </AnimatePresence>

                <div
                  ref={tagsScrollRef}
                  onScroll={checkTagsScroll}
                  className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-2 mask-linear"
                >
                  {allTags.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => onToggleTag(tag)}
                      className={`shrink-0 px-4 py-1.5 rounded-full text-xs font-medium transition-all duration-200 border ${selectedTag === tag ? "bg-primary text-primary-foreground border-primary" : "bg-muted/30 text-muted-foreground border-transparent"}`}
                    >
                      {tag.charAt(0).toUpperCase() + tag.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </section>
        )}

        <section id="products" className="container mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-6 min-h-screen flex-grow">
          <AnimatePresence mode="wait" initial={false}>
            {isLoading ? (
              <motion.div key="skeleton" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="mt-6">
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                  {Array.from({ length: 10 }).map((_, i) => (
                    <div key={i} className="border border-border/50 rounded-xl overflow-hidden bg-card h-80 animate-pulse" />
                  ))}
                </div>
              </motion.div>
            ) : (q.trim() || selectedTag || selectedCats.length > 0) ? (
              <motion.div key="filtered" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <ProductGrid products={filtered} onAddToCart={onAddToCart} isLoading={isLoading} />
                {hasNextPage && (
                  <div className="mt-8 flex justify-center pb-10">
                    <Button onClick={() => fetchNextPage()} disabled={isFetchingNextPage} variant="outline" size="lg" className="min-w-[200px]">
                      {isFetchingNextPage ? "Loading..." : "Load More Products"}
                    </Button>
                  </div>
                )}
              </motion.div>
            ) : (
              <motion.div key="categorized" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-12">
                {categories.map((cat: any) => {
                  const catProducts = products.filter(p => p.product.categoryId === parseInt(cat.id)).slice(0, 8);
                  if (catProducts.length === 0) return null;
                  return (
                    <div key={cat.id} className="pt-2 group/cat" id={`category-${cat.id}`}>
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <h3 className="text-lg md:text-xl font-bold mb-0">{cat.name}</h3>
                          <div className="hidden md:flex items-center gap-2 ml-4 opacity-0 group-hover/cat:opacity-100 transition-opacity">
                            <button onClick={() => scrollCategory(cat.id, 'left')} className="h-8 w-8 rounded-full border flex items-center justify-center"><ChevronLeft className="h-4 w-4" /></button>
                            <button onClick={() => scrollCategory(cat.id, 'right')} className="h-8 w-8 rounded-full border flex items-center justify-center"><ChevronRight className="h-4 w-4" /></button>
                          </div>
                        </div>
                        <button onClick={() => setSelectedCats([parseInt(cat.id)])} className="text-sm font-medium text-primary hover:underline">See all</button>
                      </div>
                      <div ref={el => { categoryRefs.current[cat.id] = el; }} className="flex overflow-x-auto gap-4 scrollbar-hide snap-x pb-4">
                        {catProducts.map(p => (
                          <div key={p.product.id} className="flex-shrink-0 w-44 snap-start">
                            <ProductCard product={p} onAddToCart={onAddToCart} showVariants={true} />
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
          {hasNextPage && <div ref={loadingRef} className="w-full flex justify-center py-6 mt-4"><div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>}
        </section>
      </main>

      <Footer />
      <MobileBottomNav />
    </div>
  );
};

const SNFLandingPage: React.FC = () => <SNFContent />;

export default SNFLandingPage;