import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { X, Search, Check } from "lucide-react";

interface VariantDrawerProps {
  variants: any[];
  selectedVariant: any | null;
  onVariantSelect: (variantId: number) => void;
  isOpen: boolean;
  onClose: () => void;
  productName: string;
}

export const VariantDrawer: React.FC<VariantDrawerProps> = ({
  variants,
  selectedVariant,
  onVariantSelect,
  isOpen,
  onClose,
  productName,
}) => {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredVariants = variants.filter((variant) => {
    const name = variant.name?.toLowerCase() || "";
    const sku = variant.sku?.toLowerCase() || "";
    const query = searchQuery.toLowerCase();
    return name.includes(query) || sku.includes(query);
  });

  const handleVariantSelect = (variantId: number) => {
    onVariantSelect(variantId);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 z-40 transition-opacity"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed bottom-0 left-0 right-0 bg-background rounded-t-2xl z-50 max-h-[70vh] flex flex-col animate-in slide-in-from-bottom duration-300">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div>
            <h3 className="font-semibold text-lg">Select Variant</h3>
            <p className="text-sm text-muted-foreground line-clamp-1">{productName}</p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Search */}
        <div className="p-4 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search variants..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
                onClick={() => setSearchQuery("")}
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>

        {/* Variants List */}
        <div className="flex-1 overflow-y-auto">
          {filteredVariants.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <p>No variants found</p>
              {searchQuery && (
                <p className="text-sm mt-2">Try adjusting your search</p>
              )}
            </div>
          ) : (
            <div className="p-2">
              {filteredVariants.map((variant) => {
                const variantPrice = variant.buyOncePrice || variant.mrp || 0;
                const isSelected = variant.id === selectedVariant?.id;
                const isAvailable = !variant.isHidden && !variant.notInStock;
                const lowStock = variant.closingQty !== undefined && variant.closingQty > 0 && variant.closingQty <= 10;

                return (
                  <button
                    key={variant.id}
                    onClick={() => handleVariantSelect(variant.id)}
                    disabled={!isAvailable}
                    className={`
                      w-full p-4 rounded-xl border-2 transition-all duration-200 mb-2 text-left
                      ${isSelected 
                        ? 'border-primary bg-primary/5' 
                        : isAvailable 
                          ? 'border-border hover:border-primary/50 hover:bg-accent/50' 
                          : 'border-border bg-muted/50 cursor-not-allowed opacity-60'
                      }
                    `}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3">
                          <div className="flex-1">
                            <h4 className="font-medium text-base">{variant.name}</h4>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-lg font-semibold text-primary">
                                ₹{variantPrice.toFixed(2)}
                              </span>
                              {variant.mrp && variant.mrp > variantPrice && (
                                <span className="text-sm text-muted-foreground line-through">
                                  ₹{variant.mrp.toFixed(2)}
                                </span>
                              )}
                            </div>
                            <div className="mt-2">
                              {!isAvailable ? (
                                <span className="text-xs text-destructive font-medium">Out of Stock</span>
                              ) : lowStock ? (
                                <span className="text-xs text-orange-600 font-medium">
                                  Only {variant.closingQty} left
                                </span>
                              ) : (
                                <span className="text-xs text-green-600 font-medium">In Stock</span>
                              )}
                            </div>
                          </div>
                          {isSelected && (
                            <div className="flex-shrink-0">
                              <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                                <Check className="h-4 w-4 text-primary-foreground" />
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer with selected variant info */}
        {selectedVariant && (
          <div className="p-4 border-t bg-muted/30">
            <div className="text-sm text-muted-foreground">Selected:</div>
            <div className="font-medium">{selectedVariant.name} - ₹{(selectedVariant.buyOncePrice || selectedVariant.mrp || 0).toFixed(2)}</div>
          </div>
        )}
      </div>
    </>
  );
};
