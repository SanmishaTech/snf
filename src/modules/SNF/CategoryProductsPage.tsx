import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Header } from "./components/Header.tsx";
import { Footer } from "./components/Footer.tsx";
import { ProductGrid } from "./components/ProductGrid.tsx";
import { productService } from "./services/api";
import { ProductWithPricing, DepotVariant } from "./types";
import { useCart } from "./context/CartContext.tsx";

const CategoryProductsPage: React.FC = () => {
  const { categoryId } = useParams<{ categoryId: string }>();
  const [products, setProducts] = useState<ProductWithPricing[]>([]);
  const [categoryName, setCategoryName] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const { addItem, state: cartState } = useCart();

  useEffect(() => {
    const fetchProducts = async () => {
      if (!categoryId) return;
      setIsLoading(true);
      setError(null);
      try {
        const depotId = 2; // As specified for SNF
        const fetchedProducts = await productService.getProductsByCategory(parseInt(categoryId), depotId);

        if (fetchedProducts.length > 0) {
          setCategoryName(fetchedProducts[0].category?.name || "Category");
        }

        const productsWithPricing = fetchedProducts.map(product => {
            const productVariants = product.variants || [];
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

        setProducts(productsWithPricing);
      } catch (e: any) {
        setError(e?.message || "Failed to load products");
      } finally {
        setIsLoading(false);
      }
    };

    fetchProducts();
  }, [categoryId]);

  const onAddToCart = (product: ProductWithPricing, variant?: DepotVariant, qty?: number) => {
    if (!variant) return;
    addItem(product, variant, qty || 1);
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header
        cartCount={cartState.items.reduce((n, it) => n + it.quantity, 0)}
        onSearch={() => {}}
      />
      <main className="flex-1 container mx-auto px-4 md:px-6 lg:px-8 py-8">
        <h2 className="text-2xl md:text-3xl font-semibold mb-6">
          {isLoading ? 'Loading...' : `${categoryName} Products`}
        </h2>
        {error && <p className="text-red-500">{error}</p>}
        <ProductGrid
          products={products}
          onAddToCart={onAddToCart}
          isLoading={isLoading}
        />
      </main>
      <Footer />
    </div>
  );
};

export default CategoryProductsPage;