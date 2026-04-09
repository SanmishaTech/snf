import React, { useMemo, useState, useEffect, useCallback, useTransition, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
import { useCart } from "./context/CartContext";
import { useDeliveryLocation } from "./hooks/useDeliveryLocation";
import { CategoryBar } from "./components/CategoryBar.tsx";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useSNFProducts } from "./hooks/useSNFProducts";

interface CategorySectionProps {
  cat: any;
  currentDepotId: number | null;
  pricingState: any;
  onAddToCart: (product: ProductWithPricing, variant?: DepotVariant, qty?: number) => void;
  onSeeAll: (catId: number) => void;
}

const CategorySection: React.FC<CategorySectionProps> = ({ cat, currentDepotId, pricingState, onAddToCart, onSeeAll }) => {
  const { data, isLoading } = useSNFProducts({
    depotId: currentDepotId,
    categoryId: parseInt(cat.id),
    limit: 8
  });

  const categoryRefs = useRef<HTMLDivElement | null>(null);

  const scrollCategory = (direction: 'left' | 'right') => {
    if (categoryRefs.current) {
      categoryRefs.current.scrollBy({ left: direction === 'left' ? -320 : 320, behavior: 'smooth' });
    }
  };

  const products = useMemo(() => {
    const allFetchedProducts = data?.pages.flatMap(page => page.products) || [];
    return allFetchedProducts.map(product => {
      const productVariants = pricingState.depotVariants.filter((v: any) => v.productId === product.id);
      const availableVariants = productVariants.filter((v: any) => !v.notInStock && !v.isHidden);
      const buyOncePrices = availableVariants.map((v: any) => v.buyOncePrice || v.mrp || 0).filter((p: any) => p > 0);
      const buyOncePrice = buyOncePrices.length > 0 ? Math.min(...buyOncePrices) : 0;
      const inStock = availableVariants.length > 0;
      const mrpPrices = availableVariants.map((v: any) => v.mrp || 0).filter((p: any) => p > 0);
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
  }, [data, pricingState.depotVariants]);

  if (isLoading) {
    return (
      <div className="pt-2 animate-pulse">
        <div className="h-6 w-32 bg-muted rounded mb-4" />
        <div className="flex gap-4 overflow-hidden">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex-shrink-0 w-44 h-64 bg-muted rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (products.length === 0) return null;

  return (
    <div className="pt-2 group/cat" id={`category-${cat.id}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h3 className="text-lg md:text-xl font-bold mb-0">{cat.name}</h3>
          <div className="hidden md:flex items-center gap-2 ml-4 opacity-0 group-hover/cat:opacity-100 transition-opacity">
            <button onClick={() => scrollCategory('left')} className="h-8 w-8 rounded-full border border-border flex items-center justify-center bg-background hover:border-primary/30 transition-colors"><ChevronLeft className="h-4 w-4" /></button>
            <button onClick={() => scrollCategory('right')} className="h-8 w-8 rounded-full border border-border flex items-center justify-center bg-background hover:border-primary/30 transition-colors"><ChevronRight className="h-4 w-4" /></button>
          </div>
        </div>
        <button onClick={() => onSeeAll(parseInt(cat.id))} className="text-sm font-medium text-primary hover:underline">See all</button>
      </div>
      <div ref={categoryRefs} className="flex overflow-x-auto gap-4 scrollbar-hide snap-x pb-4">
        {products.map(p => (
          <div key={p.product.id} className="flex-shrink-0 w-44 snap-start">
            <ProductCard product={p} onAddToCart={onAddToCart} showVariants={true} />
          </div>
        ))}
      </div>
    </div>
  );
};

export type SortKey = "relevance" | "price_asc" | "price_desc" | "popularity_desc";

const SNFContent: React.FC = () => {
  const [q, setQ] = useState("");
  const [selectedCats, setSelectedCats] = useState<number[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [isPending, startTransition] = useTransition();
  const location = useLocation();
  const navigate = useNavigate();

  const [categories, setCategories] = useState<any[]>([]);
  const [catLoading, setCatLoading] = useState<boolean>(false);
  const [catError, setCatError] = useState<string | null>(null);
  const [allTags, setAllTags] = useState<string[]>([]);

  const { state: pricingState, actions: pricingActions } = usePricing();
  const { addItem, state: cartState } = useCart();
  const { currentDepotId } = useDeliveryLocation();

  const selectedCatId = selectedCats.length > 0 ? selectedCats[0] : undefined;

  const {
    data: infiniteData,
    fetchNextPage,
    hasNextPage,
    isLoading: isProductsLoading,
    isFetchingNextPage,
    error: productsError
  } = useSNFProducts({
    depotId: currentDepotId || 1,
    categoryId: selectedCatId,
    tags: selectedTags.length > 0 ? selectedTags.join(',') : undefined,
    search: q || undefined,
    limit: (!selectedCatId && selectedTags.length === 0 && !q.trim()) ? 60 : undefined
  });

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
        const normalized: (any & { imageUrl?: string })[] = (Array.isArray(data) ? data : []).map((c: any) => ({
          id: String(c.id ?? ""),
          name: c.name || "Category",
          imageUrl: c.imageUrl
        }));
        const sortedCats = normalized.sort((a, b) => {
          const aMilk = a.name.toLowerCase().includes("milk") ? 1 : 0;
          const bMilk = b.name.toLowerCase().includes("milk") ? 1 : 0;
          if (aMilk !== bMilk) return bMilk - aMilk;
          return a.name.localeCompare(b.name);
        });
        setCategories(sortedCats as any[]);
      } catch (e: any) {
        setCatError(e?.message || "Failed to load categories");
      } finally {
        setCatLoading(false);
      }
    };
    const fetchTags = async () => {
      try {
        const tags = await productService.getTags();
        setAllTags(tags);
      } catch (e) {
        console.error("Failed to fetch tags", e);
      }
    };
    fetchCategories();
    fetchTags();
  }, []);

  useEffect(() => {
    if (currentDepotId && (!pricingState.currentDepot || pricingState.currentDepot.id !== currentDepotId)) {
      pricingActions.setDepot({ id: currentDepotId, name: `Depot ${currentDepotId}`, isOnline: true, address: '', city: '' } as any);
    }
  }, [currentDepotId, pricingState.currentDepot, pricingActions]);

  useEffect(() => {
    const hash = (location.hash || "").replace('#', '');
    if (!hash) return;
    if (hash.startsWith('category-')) {
      const idNum = parseInt(hash.slice('category-'.length), 10);
      if (Number.isFinite(idNum)) {
        setSelectedCats([idNum]);
        setSelectedTags([]);
      }
    }
  }, [location.hash]);

  const loadingRef = useRef<HTMLDivElement>(null);
  const handleObserver = useCallback((entries: IntersectionObserverEntry[]) => {
    const target = entries[0];
    if (target.isIntersecting && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  useEffect(() => {
    const observer = new IntersectionObserver(handleObserver, { threshold: 0.1 });
    if (loadingRef.current) observer.observe(loadingRef.current);
    return () => observer.disconnect();
  }, [handleObserver]);

  useEffect(() => {
    const tagRaw = new URLSearchParams(location.search).get("tag");
    if (!tagRaw) {
      setSelectedTags([]);
      return;
    }
    const tags = tagRaw.toLowerCase().trim().split(',').filter(Boolean);
    if (tags.some(tag => tag.startsWith('category:'))) {
      const catTag = tags.find(tag => tag.startsWith('category:'));
      const idNum = parseInt(catTag!.split(':')[1] || '', 10);
      if (Number.isFinite(idNum)) {
        setSelectedCats([idNum]);
        setSelectedTags([]);
      }
    } else {
      setSelectedTags(tags);
    }
  }, [location.search]);







  const onUpdateTags = (newTags: string[]) => {
    startTransition(() => {
      const params = new URLSearchParams(location.search || "");
      setSelectedTags(newTags);
      if (newTags.length > 0) {
        params.set("tag", newTags.join(','));
      } else {
        params.delete("tag");
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
              setSelectedTags([]);
              navigate({ search: "" }, { replace: true });
            })}
            onRetry={() => { }}
            selectedTags={selectedTags}
            allTags={allTags}
            onTagsChange={onUpdateTags}
          />
        </section>



        <section id="products" className="container mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-6 min-h-screen flex-grow">
          <AnimatePresence mode="wait" initial={false}>
            {isLoading && !q && selectedTags.length === 0 && selectedCats.length === 0 ? (
              <motion.div key="skeleton" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="mt-6">
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                  {Array.from({ length: 10 }).map((_, i) => (
                    <div key={i} className="border border-border/50 rounded-xl overflow-hidden bg-card h-80 animate-pulse" />
                  ))}
                </div>
              </motion.div>
            ) : (q.trim() || selectedTags.length > 0 || selectedCats.length > 0) ? (
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
                {categories.map((cat: any) => (
                  <CategorySection
                    key={cat.id}
                    cat={cat}
                    currentDepotId={currentDepotId}
                    pricingState={pricingState}
                    onAddToCart={onAddToCart}
                    onSeeAll={(id) => startTransition(() => setSelectedCats([id]))}
                  />
                ))}
              </motion.div>
            )}
          </AnimatePresence>
          {hasNextPage && (q.trim() || selectedTags.length > 0 || selectedCats.length > 0) && <div ref={loadingRef} className="w-full flex justify-center py-6 mt-4"><div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>}
        </section>
      </main>

      <Footer />
      <MobileBottomNav />
    </div>
  );
};

const SNFLandingPage: React.FC = () => <SNFContent />;

export default SNFLandingPage;