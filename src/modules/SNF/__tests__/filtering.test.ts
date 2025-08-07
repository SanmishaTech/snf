import { describe, it, expect } from "vitest";
import { filterProducts, searchProducts, sortProducts } from "../lib/filtering";
import type { Product } from "../components/ProductGrid";

const base: Product[] = [
  { id: "1", title: "Apple", description: "Fresh fruit", image: "", price: 100, rating: 4.2, popularity: 50, category: "fruits" },
  { id: "2", title: "Tomato", description: "Juicy", image: "", price: 60, rating: 4.0, popularity: 70, category: "vegetables" },
  { id: "3", title: "Milk A2", description: "Dairy goodness", image: "", price: 90, discountPct: 10, rating: 4.8, popularity: 90, category: "dairy" },
];

describe("filtering utils", () => {
  it("searchProducts filters by title/description/category", () => {
    expect(searchProducts(base, "milk")).toHaveLength(1);
    expect(searchProducts(base, "fruit")).toHaveLength(1);
    expect(searchProducts(base, "vegetables")).toHaveLength(1);
    expect(searchProducts(base, "")).toHaveLength(3);
  });

  it("filterProducts respects categories", () => {
    expect(filterProducts(base, ["all"]).length).toBe(3);
    expect(filterProducts(base, []).length).toBe(3);
    expect(filterProducts(base, ["fruits"]).length).toBe(1);
    expect(filterProducts(base, ["fruits", "dairy"]).length).toBe(2);
  });

  it("sortProducts sorts by price asc/desc considering discount", () => {
    const asc = sortProducts(base, "price_asc");
    const desc = sortProducts(base, "price_desc");
    expect(asc[0].id).toBe("2"); // 60
    // Milk effective: 90 * 0.9 = 81, Apple 100
    expect(asc[1].id).toBe("3"); // 81
    expect(desc[0].id).toBe("1"); // 100 highest
  });

  it("sortProducts sorts by rating and popularity", () => {
    const byRating = sortProducts(base, "rating_desc");
    expect(byRating[0].id).toBe("3");
    const byPop = sortProducts(base, "popularity_desc");
    expect(byPop[0].id).toBe("3");
  });
});