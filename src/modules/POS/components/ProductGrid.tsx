import * as React from "react";
import { 
  Search, 
  LayoutGrid, 
  Package, 
  SlidersHorizontal, 
  ArrowUpDown, 
  Filter,
  CheckCircle2
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu";
import { Product, ProductVariant } from "../posService";
import { cn } from "@/lib/utils";

interface ProductGridProps {
  productSearch: string;
  setProductSearch: (query: string) => void;
  products: Product[];
  productsLoading: boolean;
  handleAddToCart: (product: Product, variant: ProductVariant) => void;
}

export function ProductGrid({
  productSearch,
  setProductSearch,
  products,
  productsLoading,
  handleAddToCart,
}: ProductGridProps) {
  // Internal filtering and sorting state
  const [sortBy, setSortBy] = React.useState<string>("default");
  const [selectedCategory, setSelectedCategory] = React.useState<string>("All");
  const [showInStockOnly, setShowInStockOnly] = React.useState<boolean>(false);

  // Derived unique categories for filter menu
  const categories = React.useMemo(() => {
    const cats = products.map(p => p.category);
    return ["All", ...Array.from(new Set(cats))];
  }, [products]);

  // Derived filtered and sorted products
  const processedProducts = React.useMemo(() => {
    let result = [...products];

    // 1. Search Filter
    if (productSearch.trim()) {
      const query = productSearch.toLowerCase();
      result = result.filter(p => 
        p.name.toLowerCase().includes(query) || 
        p.category.toLowerCase().includes(query)
      );
    }

    // 2. Category Filter
    if (selectedCategory !== "All") {
      result = result.filter(p => p.category === selectedCategory);
    }

    // 3. In-Stock Filter
    if (showInStockOnly) {
      result = result.filter(p => p.variants[0]?.stock > 0);
    }

    // 4. Sorting logic
    if (sortBy === "price-asc") {
      result.sort((a, b) => (a.variants[0]?.price || 0) - (b.variants[0]?.price || 0));
    } else if (sortBy === "price-desc") {
      result.sort((a, b) => (b.variants[0]?.price || 0) - (a.variants[0]?.price || 0));
    } else if (sortBy === "name-asc") {
      result.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortBy === "name-desc") {
      result.sort((a, b) => b.name.localeCompare(a.name));
    }

    return result;
  }, [products, productSearch, sortBy, selectedCategory, showInStockOnly]);

  return (
    <div className="flex-1 flex flex-col bg-[#F9FBFC] min-w-0">
      {/* Product Search & Filter Header */}
      <div className="p-5 flex items-center gap-3">
        <div className="relative flex-1 group">
          <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors">
             <Search className="w-5 h-5" />
          </div>
          <Input
            placeholder="Search products..."
            value={productSearch}
            onChange={(e) => setProductSearch(e.target.value)}
            className="pl-11 pr-4 h-12 bg-white border-2 border-transparent shadow-sm rounded-2xl placeholder:text-slate-400 text-sm focus-visible:ring-blue-100 focus-visible:border-blue-100 transition-all font-medium"
          />
        </div>

        {/* Unified Filter & Sort Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
                variant="outline" 
                className={cn(
                    "h-12 px-4 rounded-2xl border-none shadow-sm bg-white font-bold text-slate-600 gap-2 hover:bg-slate-50 transition-all",
                    (sortBy !== "default" || selectedCategory !== "All" || showInStockOnly) && "bg-blue-50 text-blue-600 hover:bg-blue-100"
                )}
            >
              <SlidersHorizontal className="w-4 h-4" />
              <span className="hidden sm:inline">Filter</span>
              {(sortBy !== "default" || selectedCategory !== "All" || showInStockOnly) && (
                  <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse" />
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64 rounded-2xl p-2 shadow-2xl border-slate-100">
            <DropdownMenuLabel className="px-3 py-2 text-xs font-black text-slate-400 uppercase tracking-widest">
                Sort By
            </DropdownMenuLabel>
            <DropdownMenuRadioGroup value={sortBy} onValueChange={setSortBy}>
              <DropdownMenuRadioItem value="default" className="rounded-xl font-medium">Default Order</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="price-asc" className="rounded-xl font-medium flex justify-between items-center">
                  Price: Low to High <ArrowUpDown className="w-3 h-3 ml-2 opacity-50" />
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="price-desc" className="rounded-xl font-medium flex justify-between items-center">
                  Price: High to Low <ArrowUpDown className="w-3 h-3 ml-2 opacity-50" />
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="name-asc" className="rounded-xl font-medium">Name: A to Z</DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>

            <DropdownMenuSeparator className="my-2" />
            
            <DropdownMenuLabel className="px-3 py-2 text-xs font-black text-slate-400 uppercase tracking-widest">
                Category
            </DropdownMenuLabel>
            <ScrollArea className="max-h-[240px] pr-4">
                <DropdownMenuRadioGroup value={selectedCategory} onValueChange={setSelectedCategory}>
                {categories.map(cat => (
                    <DropdownMenuRadioItem key={cat} value={cat} className="rounded-xl font-medium">
                        {cat}
                    </DropdownMenuRadioItem>
                ))}
                </DropdownMenuRadioGroup>
            </ScrollArea>

            <DropdownMenuSeparator className="my-2" />

            <DropdownMenuCheckboxItem 
                checked={showInStockOnly} 
                onCheckedChange={setShowInStockOnly}
                className="rounded-xl font-bold text-blue-600"
            >
                Only Show In-Stock
            </DropdownMenuCheckboxItem>

            {(sortBy !== "default" || selectedCategory !== "All" || showInStockOnly) && (
                <>
                <DropdownMenuSeparator className="my-2" />
                <DropdownMenuItem 
                    className="rounded-xl font-black text-rose-500 justify-center h-10 hover:bg-rose-50 cursor-pointer"
                    onClick={() => {
                        setSortBy("default");
                        setSelectedCategory("All");
                        setShowInStockOnly(false);
                    }}
                >
                    RESET ALL
                </DropdownMenuItem>
                </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* active filter badges */}
      {(selectedCategory !== "All" || showInStockOnly) && (
          <div className="px-5 pb-3 flex flex-wrap gap-2">
            {selectedCategory !== "All" && (
                <Badge variant="secondary" className="rounded-full bg-blue-50 text-blue-600 border-none font-bold py-1 px-3 flex items-center gap-1.5">
                    <Filter className="w-3 h-3" /> {selectedCategory}
                    <button onClick={() => setSelectedCategory("All")} className="hover:text-blue-800 font-bold ml-1">×</button>
                </Badge>
            )}
            {showInStockOnly && (
                <Badge variant="secondary" className="rounded-full bg-green-50 text-green-600 border-none font-bold py-1 px-3 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3 h-3" /> In Stock
                    <button onClick={() => setShowInStockOnly(false)} className="hover:text-green-800 font-bold ml-1">×</button>
                </Badge>
            )}
          </div>
      )}

      {/* Main Content */}
      <ScrollArea className="flex-1 px-5 pb-5">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-800 tracking-tight">
              {productSearch || selectedCategory !== "All" ? "Search Results" : "All Products"}
          </h2>
          <div className="text-xs font-black text-slate-400 uppercase tracking-widest">
              {processedProducts.length} Items Found
          </div>
        </div>

        {productsLoading ? (
            <div className="flex flex-col items-center justify-center py-20 opacity-20">
              <Package className="w-16 h-16 animate-pulse" />
              <p className="mt-4 text-sm font-medium">Loading products...</p>
            </div>
          ) : processedProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-32 text-slate-400 text-center">
               <Package className="w-20 h-20 opacity-5 mb-6" />
               <p className="text-lg font-black text-slate-300">No products found</p>
               <p className="text-sm font-medium text-slate-400 max-w-[200px] mt-2">Try adjusting your filters or search query</p>
               <Button 
                variant="ghost" 
                className="mt-6 font-bold text-blue-500 hover:bg-blue-50 rounded-xl"
                onClick={() => {
                    setProductSearch("");
                    setSelectedCategory("All");
                    setShowInStockOnly(false);
                    setSortBy("default");
                }}
               >
                   Clear All Filters
               </Button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-5">
            {processedProducts.map((product) => (
              <div
                key={product.id}
                onClick={() => handleAddToCart(product, product.variants[0])}
                className="group relative bg-white rounded-[2.5rem] p-4 md:p-5 border border-slate-100 hover:border-blue-200 transition-all duration-300 hover:shadow-2xl hover:shadow-blue-900/5 flex flex-col items-center text-center cursor-pointer active:scale-95 overflow-hidden"
              >
                {/* Badge if stock low */}
                {product.variants[0]?.stock <= 5 && product.variants[0]?.stock > 0 && (
                  <div className="absolute top-4 left-4 z-10">
                    <Badge className="bg-amber-100 text-amber-700 border-none rounded-lg px-2 py-0.5 text-[9px] font-black tracking-widest uppercase">
                      Low Stock
                    </Badge>
                  </div>
                )}

                {/* Product Image */}
                <div className="w-full aspect-square bg-slate-50 rounded-[2rem] flex items-center justify-center mb-4 md:mb-5 group-hover:bg-blue-50/50 transition-all duration-500">
                  {product.imageUrl ? (
                    <img
                      src={product.imageUrl}
                      alt={product.name}
                      className="w-full h-full object-cover rounded-[2rem] group-hover:scale-110 transition-transform duration-500"
                    />
                  ) : (
                    <div className="text-slate-200">
                       <LayoutGrid className="w-12 h-12" />
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="space-y-1 w-full">
                  <div className="text-[10px] font-black text-slate-300 uppercase tracking-widest">{product.category}</div>
                  <h3 className="font-black text-[13px] md:text-[14px] text-slate-800 leading-tight line-clamp-2 min-h-[2.5rem]">
                    {product.name}
                  </h3>
                  
                  <div className="pt-2 flex flex-col items-center gap-1">
                    <div className="text-blue-600 font-bold text-base md:text-lg tracking-tighter">
                      ₹{Number(product.variants[0]?.price || 0).toFixed(2)}
                    </div>
                    <div className={cn(
                        "text-[9px] md:text-[10px] font-black uppercase tracking-widest",
                        product.variants[0]?.stock > 0 ? "text-slate-300" : "text-rose-400"
                    )}>
                      {product.variants[0]?.stock > 0 ? (
                          `${product.variants[0]?.stock} IN STOCK`
                      ) : "OUT OF STOCK"}
                    </div>
                  </div>
                </div>

                {/* Add Indicator */}
                <div className="absolute top-4 right-4 bg-blue-600 text-white w-8 h-8 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 translate-x-4 group-hover:translate-x-0 transition-all shadow-lg">
                    <Package className="w-4 h-4" />
                </div>
              </div>
            ))}
          </div>
          )}
      </ScrollArea>
    </div>
  );
}
