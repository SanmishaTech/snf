import React, { useMemo, useState, useEffect } from "react";
// Use explicit file extensions to satisfy TS module resolution in Vite/TS strict setups
import { Header } from "./components/Header.tsx";
import { Footer } from "./components/Footer.tsx";
import { Hero } from "./components/Hero.tsx";
import { CategoryFilters } from "./components/CategoryFilters.tsx";
import { SortControls } from "./components/SortControls.tsx";
import { ProductGrid } from "./components/ProductGrid.tsx";
import { MarqueeBanner } from "./components/MarqueeBanner.tsx";
import { PincodeEntry } from "./components/PincodeEntry.tsx";
import { ErrorDisplay, ErrorCard } from "./components/ErrorDisplay.tsx";
import { DepotInfo } from "./components/DepotInfo.tsx";
import {
  LoadingSkeleton,
  ProductSkeleton,
  DepotSkeleton,
  LocationSkeleton,
  PriceUpdateSkeleton,
  CategorySkeleton
} from "./components/LoadingSkeleton.tsx";
import { categories as mockCategories } from "./data/categories.ts";
import { banners as mockBanners } from "./data/banners.ts";
import { usePricing } from "./context/PricingContext.tsx";
import { useLocation } from "./hooks/useLocation";
import { useDepot } from "./hooks/useDepot";
import { useProducts } from "./hooks/useProducts";
import { useRealTimePricing } from "./hooks/useRealTimePricing";
import { ProductWithPricing } from "./types";

export type SortKey = "relevance" | "price_asc" | "price_desc" | "popularity_desc";

const SNFLandingPage: React.FC = () => {
  const [q, setQ] = useState("");
  const [selectedCats, setSelectedCats] = useState<number[]>([]);
  const [sort, setSort] = useState<SortKey>("relevance");
  const [cartCount, setCartCount] = useState(0);
  const [showPincodeEntry, setShowPincodeEntry] = useState(false);

  const { state: pricingState, actions: pricingActions } = usePricing();
  const {
    location,
    error: locationError,
    isLoading: locationLoading,
    requestLocation,
    setManualPincode
  } = useLocation();
  const { depot, error: depotError, isLoading: depotLoading } = useDepot(location?.pincode);
  const { products, error: productsError, isLoading: productsLoading } = useProducts(depot?.id);
  
  // Real-time pricing updates
  const {
    isRefreshing: isPriceRefreshing,
    lastRefreshTime,
    refreshPrices,
    refreshError: priceRefreshError
  } = useRealTimePricing({
    refreshInterval: 5 * 60 * 1000, // 5 minutes
    enableBackgroundRefresh: true,
    onPriceUpdate: (updatedProducts) => {
      console.log('Prices updated:', updatedProducts.length, 'products');
    }
  });

  const categories = mockCategories;

  // Auto-request location on component mount
  useEffect(() => {
    const initializeLocation = async () => {
      try {
        await requestLocation();
      } catch (error) {
        console.warn('Auto-location request failed, user will need to enter pincode manually');
        setShowPincodeEntry(true);
      }
    };

    initializeLocation();
  }, [requestLocation]);

  // Update pricing context when depot changes
  useEffect(() => {
    if (depot) {
      pricingActions.setDepot(depot);
    }
  }, [depot, pricingActions]);

  // Update pricing context when location changes
  useEffect(() => {
    if (location) {
      pricingActions.setLocation(location);
    }
  }, [location, pricingActions]);

  // Filter and sort products
  const filtered = useMemo(() => {
    let filteredProducts = products;

    // Search filter
    if (q.trim()) {
      const term = q.trim().toLowerCase();
      filteredProducts = filteredProducts.filter(p =>
        p.product.name.toLowerCase().includes(term) ||
        p.product.description?.toLowerCase().includes(term)
      );
    }

    // Category filter
    if (selectedCats.length > 0) {
      filteredProducts = filteredProducts.filter(p =>
        selectedCats.includes(p.product.categoryId || 0)
      );
    }

    // Sort
    const sorted = [...filteredProducts];
    switch (sort) {
      case "price_asc":
        sorted.sort((a, b) => a.bestPrice - b.bestPrice);
        break;
      case "price_desc":
        sorted.sort((a, b) => b.bestPrice - a.bestPrice);
        break;
      case "popularity_desc":
        sorted.sort((a, b) => (b.product.id || 0) - (a.product.id || 0)); // Fallback sort
        break;
      case "relevance":
      default:
        // Default sort by price then by product id
        sorted.sort((a, b) => {
          if (a.bestPrice !== b.bestPrice) return a.bestPrice - b.bestPrice;
          return (a.product.id || 0) - (b.product.id || 0);
        });
        break;
    }

    return sorted;
  }, [products, q, selectedCats, sort]);

  const onToggleCategory = (id: string) => {
    setSelectedCats((prev) => {
      const categoryId = parseInt(id);
      if (prev.includes(categoryId)) {
        return prev.filter((x) => x !== categoryId);
      } else {
        return [...prev, categoryId];
      }
    });
  };

  const onAddToCart = (product: ProductWithPricing) => {
    setCartCount((c) => c + 1);
    // TODO: Add to cart logic
    console.log('Added to cart:', product);
  };

  const handlePincodeSubmit = async (pincode: string) => {
    try {
      await setManualPincode(pincode);
      setShowPincodeEntry(false);
    } catch (error) {
      console.error('Error setting pincode:', error);
    }
  };

  const handleLocationRequest = async () => {
    try {
      await requestLocation();
      setShowPincodeEntry(false);
    } catch (error) {
      console.error('Error requesting location:', error);
    }
  };

  const isLoading = locationLoading || depotLoading || productsLoading || isPriceRefreshing;
  const error = locationError || depotError || productsError || pricingState.error || priceRefreshError as GeolocationError | PricingError | null;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header cartCount={cartCount} onSearch={setQ} />

      <main className="flex-1">
        {/* Keep current hero section */}
        <Hero />

        {/* Location/Pincode Entry Section */}
        <section className="container mx-auto px-4 md:px-6 lg:px-8 py-4">
          {showPincodeEntry && (
            <PincodeEntry
              onPincodeSubmit={handlePincodeSubmit}
              onLocationRequest={handleLocationRequest}
              isLoading={isLoading}
              error={locationError}
            />
          )}
          
          {locationLoading ? (
            <LocationSkeleton />
          ) : depotLoading ? (
            <DepotSkeleton />
          ) : location && depot ? (
            <div className="relative">
              <DepotInfo
                depot={depot}
                serviceAvailability={pricingState.serviceAvailability}
                onRefresh={() => {
                  if (location) handlePincodeSubmit(location.pincode);
                }}
                onChangeLocation={() => setShowPincodeEntry(true)}
                isLoading={isLoading}
              />
              
              {/* Price refresh indicator */}
              {isPriceRefreshing && (
                <div className="absolute top-2 right-2 bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full flex items-center">
                  <div className="w-2 h-2 bg-blue-600 rounded-full mr-1 animate-pulse"></div>
                  Updating prices...
                </div>
              )}
              
              {/* Last refresh time */}
              {lastRefreshTime && !isPriceRefreshing && (
                <div className="absolute bottom-2 right-2 text-xs text-gray-500">
                  Prices updated: {lastRefreshTime.toLocaleTimeString()}
                </div>
              )}
            </div>
          ) : null}

          {error && (
            <div className="mb-4">
              <ErrorDisplay
                error={error}
                onRetry={() => {
                  if (locationError) handleLocationRequest();
                  if (depotError && location) handlePincodeSubmit(location.pincode);
                  if (productsError && depot) pricingActions.refreshPricing();
                }}
                onDismiss={() => pricingActions.setError(null)}
              />
            </div>
          )}
        </section>

        {/* New auto-scrolling marquee banner below hero */}
        <div className="mt-4">
          <MarqueeBanner items={mockBanners} height={120} speed={25} />
        </div>

        <section className="container mx-auto px-4 md:px-6 lg:px-8 py-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <CategoryFilters
              categories={categories}
              selected={selectedCats.map(String)}
              onToggle={onToggleCategory}
            />
            <SortControls value={sort} onChange={setSort} />
          </div>

          {productsLoading ? (
            <div className="mt-6">
              <ProductSkeleton count={8} />
            </div>
          ) : (
            <div className="mt-6">
              <ProductGrid
                products={filtered}
                onAddToCart={onAddToCart}
                isLoading={isLoading}
              />
            </div>
          )}
        </section>

        <section className="container mx-auto px-4 md:px-6 lg:px-8 py-8">
          <h2 className="text-xl md:text-2xl font-semibold mb-4">Seasonal picks</h2>
          <p className="text-muted-foreground">Hand-picked fresh deals for you.</p>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default SNFLandingPage;