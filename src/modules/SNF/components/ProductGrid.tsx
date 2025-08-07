import React from "react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { ProductWithPricing } from "../types";

interface ProductGridProps {
  products: ProductWithPricing[];
  onAddToCart: (p: ProductWithPricing) => void;
  isLoading?: boolean;
}

export const ProductGrid: React.FC<ProductGridProps> = ({ products, onAddToCart, isLoading = false }) => {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, index) => (
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
    <div id="products" className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
      {products.map((p) => (
        <article
          key={p.product.id}
          className="group rounded-lg border bg-card text-card-foreground overflow-hidden hover:shadow transition focus-within:shadow"
        >
          <Link to={`/snf/product/${p.product.id}`} className="block focus:outline-none" aria-label={`View details for ${p.product.name}`}>
            <div className="relative aspect-[4/3] bg-muted/30 overflow-hidden">
              <img
                src={p.product.attachmentUrl || `https://images.unsplash.com/photo-1546470427-0fd2788c37e3?auto=format&fit=crop&w=400&q=80`}
                alt={p.product.name}
                loading="lazy"
                decoding="async"
                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                srcSet={`${p.product.attachmentUrl || `https://images.unsplash.com/photo-1546470427-0fd2788c37e3?auto=format&fit=crop&w=400&q=80`}&w=320 320w, ${p.product.attachmentUrl || `https://images.unsplash.com/photo-1546470427-0fd2788c37e3?auto=format&fit=crop&w=400&q=80`}&w=480 480w, ${p.product.attachmentUrl || `https://images.unsplash.com/photo-1546470427-0fd2788c37e3?auto=format&fit=crop&w=400&q=80`}&w=640 640w`}
                sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
              />
              {p.discount && p.discount > 0 && (
                <div className="absolute left-2 top-2 rounded bg-destructive text-white text-xs px-2 py-1 shadow">
                  -{Math.round(p.discount * 100)}%
                </div>
              )}
              {!p.inStock && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                  <span className="text-white font-medium text-sm">Out of Stock</span>
                </div>
              )}
            </div>
          </Link>

          <div className="p-3 space-y-2">
            <h3 className="text-sm font-medium line-clamp-1" title={p.product.name}>
              <Link to={`/snf/product/${p.product.id}`} className="hover:underline focus:outline-none">
                {p.product.name}
              </Link>
            </h3>
            <p className="text-xs text-muted-foreground line-clamp-2" title={p.product.description}>
              {p.product.description || 'No description available'}
            </p>

            <div className="flex items-center justify-between pt-1">
              <div className="flex items-baseline gap-1">
                <span className="text-base font-semibold">
                  ₹{p.bestPrice.toFixed(2)}
                </span>
                {p.originalPrice && p.originalPrice > p.bestPrice && (
                  <span className="text-xs text-muted-foreground line-through">
                    ₹{p.originalPrice.toFixed(2)}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1">
                {p.inStock ? (
                  <span className="text-xs text-green-600">In Stock</span>
                ) : (
                  <span className="text-xs text-red-600">Out of Stock</span>
                )}
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                className="w-full mt-1"
                onClick={() => onAddToCart(p)}
                aria-label={`Add ${p.product.name} to cart`}
                disabled={!p.inStock}
              >
                {!p.inStock ? 'Out of Stock' : 'Add to cart'}
              </Button>
              <Link
                to={`/snf/product/${p.product.id}`}
                className="w-full mt-1 inline-flex items-center justify-center rounded-md border px-3 py-2 text-sm hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label={`View ${p.product.name} details`}
              >
                View
              </Link>
            </div>
          </div>
        </article>
      ))}
      {products.length === 0 && (
        <div className="col-span-full text-center text-muted-foreground py-10">
          No products found. Try adjusting filters or search.
        </div>
      )}
    </div>
  );
};
