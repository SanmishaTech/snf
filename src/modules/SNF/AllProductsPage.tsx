import React, { useMemo, useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ProductGrid } from "./components/ProductGrid.tsx";
import { usePricing } from "./context/PricingContext.tsx";
import { ProductWithPricing, DepotVariant } from "./types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCart } from "./context/CartContext";
import { Header } from "./components/Header.tsx";
import { Footer } from "./components/Footer.tsx";
import { MobileBottomNav } from "./components/MobileBottomNav.tsx";
import { useSNFProducts } from "./hooks/useSNFProducts";
import { useDeliveryLocation } from "./hooks/useDeliveryLocation";

export type SortKey = "relevance" | "price_asc" | "price_desc" | "popularity_desc";

const AllProductsContent: React.FC = () => {
  const [q, setQ] = useState("");
  const [selectedCats, setSelectedCats] = useState<number[]>([]);
  const [sort] = useState<SortKey>("relevance");
  const location = useLocation();

  const { state: pricingState } = usePricing();
  const { addItem, state: cartState } = useCart();
  const { currentDepotId } = useDeliveryLocation();

  const {
    data: infiniteData,
    fetchNextPage,
    hasNextPage,
    isLoading: isProductsLoading,
    isFetchingNextPage
  } = useSNFProducts({
    depotId: currentDepotId,
    categoryId: selectedCats[0],
    search: q || undefined
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

  // Handle category filter from query param `?category=<id>`
  useEffect(() => {
    const params = new URLSearchParams(location.search || "");
    const categoryId = params.get('category');
    if (categoryId) {
      const idNum = parseInt(categoryId, 10);
      if (Number.isFinite(idNum)) {
        setSelectedCats([idNum]);
      }
    } else {
      setSelectedCats([]);
    }
  }, [location.search]);

  const filtered = useMemo(() => {
    const sorted = [...products];
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
  }, [products, sort]);

  const onAddToCart = (product: ProductWithPricing, variant?: DepotVariant, qty?: number) => {
    if (!variant) return;
    addItem(product, variant, qty || 1);
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header cartCount={cartState.items.reduce((n, it) => n + it.quantity, 0)} onSearch={setQ} />

      <main className="flex-1 pt-14 md:pt-16">
        <section id="products" className="container mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-6">
          <div className="flex items-end justify-between py-4">
            <div>
              <h2 className="text-xl md:text-2xl font-semibold">Products</h2>
              <p className="text-sm text-muted-foreground">
                Browse our selection of products
              </p>
            </div>
          </div>

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
              {hasNextPage && (
                <div className="mt-8 flex justify-center pb-10">
                  <Button
                    onClick={() => fetchNextPage()}
                    disabled={isFetchingNextPage}
                    variant="outline"
                    className="min-w-[200px]"
                  >
                    {isFetchingNextPage ? "Loading..." : "Load More Products"}
                  </Button>
                </div>
              )}
            </div>
          )}
        </section>
      </main>

      <Footer />
      <MobileBottomNav />
    </div>
  );
};

const AllProductsPage: React.FC = () => {
  return (
    <AllProductsContent />
  );
};

export default AllProductsPage;
