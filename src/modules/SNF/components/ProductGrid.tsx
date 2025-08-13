import React from "react";
import { ProductCard } from "./ProductCard";
import { ProductWithPricing, DepotVariant } from "../types";

interface ProductGridProps {
  products: ProductWithPricing[];
  onAddToCart: (p: ProductWithPricing, variant?: DepotVariant, qty?: number) => void;
  isLoading?: boolean;
  showVariants?: boolean; // New prop to control variant display
}

export const ProductGrid: React.FC<ProductGridProps> = ({ products, onAddToCart, isLoading = false, showVariants = true }) => {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-x-4 gap-y-6 sm:gap-x-5 sm:gap-y-8">
        {Array.from({ length: 12 }).map((_, index) => (
          <div key={index} className="rounded-lg border bg-card text-card-foreground overflow-hidden">
            <div className="aspect-[4/3] bg-muted/30 animate-pulse" />
            <div className="p-3 space-y-2">
              <div className="h-4 bg-muted rounded animate-pulse" />
              <div className="h-3 bg-muted rounded animate-pulse w-3/4" />
              <div className="flex items-center justify-between pt-1">
                <div className="h-5 bg-muted rounded animate-pulse w-16" />
                <div className="h-4 bg-muted rounded animate-pulse w-20" />
              </div>
              <div className="flex gap-2">
                <div className="h-8 bg-muted rounded animate-pulse flex-1" />
                <div className="h-8 bg-muted rounded animate-pulse flex-1" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div
      id="products"
      className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-x-4 gap-y-6 sm:gap-x-5 sm:gap-y-8"
    >
      {products.map((p) => (
        <ProductCard
          key={p.product.id}
          product={p}
          onAddToCart={onAddToCart}
          showVariants={showVariants}
        />
      ))}
      {products.length === 0 && (
        <div className="col-span-full text-center text-muted-foreground py-10">
          No products found. Try adjusting filters or search.
        </div>
      )}
    </div>
  );
};
