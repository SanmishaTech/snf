import React from "react";
import { ProductCard } from "./ProductCard";
import { ProductWithPricing, DepotVariant } from "../types";
import { motion, AnimatePresence } from "framer-motion";

interface ProductGridProps {
  products: ProductWithPricing[];
  onAddToCart: (p: ProductWithPricing, variant?: DepotVariant, qty?: number) => void;
  isLoading?: boolean;
  showVariants?: boolean;
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.95 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: "spring",
      stiffness: 260,
      damping: 20,
    }
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    transition: { duration: 0.2 }
  }
};

export const ProductGrid: React.FC<ProductGridProps> = ({ products, onAddToCart, isLoading = false, showVariants = true }) => {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-x-4 gap-y-6 sm:gap-x-5 sm:gap-y-8">
        {Array.from({ length: 12 }).map((_, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.03, duration: 0.3 }}
            className="border border-border/50 rounded-xl overflow-hidden shadow-sm bg-card"
          >
            <div className="aspect-[4/3] w-full bg-muted/40 animate-pulse relative">
              <div className="absolute inset-0 bg-gradient-to-t from-background/10 to-transparent" />
            </div>
            <div className="p-3 sm:p-4 space-y-3">
              <div className="h-4 w-3/4 bg-muted/50 rounded animate-pulse" />
              <div className="h-3 w-1/2 bg-muted/40 rounded animate-pulse" />
              <div className="flex justify-between items-center pt-2">
                <div className="h-5 w-12 bg-muted/50 rounded animate-pulse" />
                <div className="h-8 w-16 bg-primary/10 rounded-full animate-pulse" />
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    );
  }

  return (
    <motion.div
      id="products"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-x-4 gap-y-6 sm:gap-x-5 sm:gap-y-8"
    >
      <AnimatePresence mode="popLayout">
        {products.map((p) => (
          <motion.div
            key={p.product.id}
            layout
            variants={itemVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            <ProductCard
              product={p}
              onAddToCart={onAddToCart}
              showVariants={showVariants}
            />
          </motion.div>
        ))}
      </AnimatePresence>
      {products.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="col-span-full text-center text-muted-foreground py-10"
        >
          No products found. Try adjusting filters or search.
        </motion.div>
      )}
    </motion.div>
  );
};
