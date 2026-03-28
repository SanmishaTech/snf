/**
 * Parses variant names (e.g., "500 gm", "1 kg", "1L") and returns the quantity in a base unit (grams or milliliters).
 * Used for sorting variants by size.
 */
export const parseVariantQuantity = (name: string): number => {
  const lowerName = (name || "").toLowerCase();
  const match = lowerName.match(/(\d+(\.\d+)?)\s*(gm|g|kg|kgm|ml|l|ltr|litre|liter)/);
  
  if (!match) {
    // Check for some common single-word labels
    if (lowerName.includes("one liter") || lowerName.includes("1 liter")) return 1000;
    if (lowerName.includes("half liter")) return 500;
    return 0;
  }

  const value = parseFloat(match[1]);
  const unit = match[3];

  switch (unit) {
    case 'kg':
    case 'kgm':
    case 'l':
    case 'ltr':
    case 'litre':
    case 'liter':
      return value * 1000;
    case 'gm':
    case 'g':
    case 'ml':
    default:
      return value;
  }
};

/**
 * Comparator for product variants based on their parsed quantity.
 */
export const compareVariantsByQuantity = (a: any, b: any): number => {
  const qtyA = parseVariantQuantity(a.name || "");
  const qtyB = parseVariantQuantity(b.name || "");
  
  if (qtyA !== qtyB) {
    return qtyA - qtyB;
  }
  
  // Tie-breaker: sort by price if quantities are the same or unparsable
  const priceA = a.buyOncePrice || a.mrp || 0;
  const priceB = b.buyOncePrice || b.mrp || 0;
  return priceA - priceB;
};
