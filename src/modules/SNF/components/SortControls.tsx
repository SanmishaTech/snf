import React from "react";
import type { SortKey } from "../SNFLandingPage";

interface SortControlsProps {
  value: SortKey;
  onChange: (next: SortKey) => void;
}

export const SortControls: React.FC<SortControlsProps> = ({ value, onChange }) => {
  return (
    <div className="flex items-center gap-2" role="group" aria-label="Sort products">
      <label htmlFor="snf-sort" className="text-sm text-muted-foreground">Sort by</label>
      <select
        id="snf-sort"
        className="h-9 rounded-md border px-3 text-sm bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        value={value}
        onChange={(e) => onChange(e.target.value as SortKey)}
        aria-label="Sort by"
      >
        <option value="relevance">Relevance</option>
        <option value="price_asc">Price: Low to High</option>
        <option value="price_desc">Price: High to Low</option>
        <option value="rating_desc">Rating</option>
        <option value="popularity_desc">Popularity</option>
      </select>
    </div>
  );
};