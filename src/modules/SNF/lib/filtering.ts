import type { Product } from "../components/ProductGrid";
import type { SortKey } from "../SNFLandingPage";

export function searchProducts(products: Product[], q: string): Product[] {
  if (!q?.trim()) return products;
  const term = q.trim().toLowerCase();
  return products.filter(
    (p) =>
      p.title.toLowerCase().includes(term) ||
      p.description.toLowerCase().includes(term) ||
      p.category.toLowerCase().includes(term)
  );
}

export function filterProducts(products: Product[], selectedCategories: string[]): Product[] {
  if (!selectedCategories?.length || selectedCategories.includes("all")) {
    return products;
  }
  const set = new Set(selectedCategories);
  return products.filter((p) => set.has(p.category));
}

export function sortProducts(products: Product[], sort: SortKey): Product[] {
  const arr = [...products];
  switch (sort) {
    case "price_asc":
      arr.sort((a, b) => effectivePrice(a) - effectivePrice(b));
      break;
    case "price_desc":
      arr.sort((a, b) => effectivePrice(b) - effectivePrice(a));
      break;
    case "rating_desc":
      arr.sort((a, b) => b.rating - a.rating);
      break;
    case "popularity_desc":
      arr.sort((a, b) => b.popularity - a.popularity);
      break;
    case "relevance":
    default:
      // stable: popularity then rating
      arr.sort((a, b) => {
        if (b.popularity !== a.popularity) return b.popularity - a.popularity;
        return b.rating - a.rating;
      });
      break;
  }
  return arr;
}

function effectivePrice(p: Product): number {
  const discount = p.discountPct ? p.discountPct / 100 : 0;
  return p.price * (1 - discount);
}