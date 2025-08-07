import React from "react";

export interface Category {
  id: string;
  name: string;
}

interface CategoryFiltersProps {
  categories: Category[];
  selected: string[];
  onToggle: (id: string) => void;
}

export const CategoryFilters: React.FC<CategoryFiltersProps> = ({
  categories,
  selected,
  onToggle,
}) => {
  return (
    <div
      className="flex gap-2 overflow-x-auto py-2"
      role="group"
      aria-label="Filter by category"
    >
      {categories.map((c) => {
        const isSelected = selected.includes(c.id);
        return (
          <button
            key={c.id}
            onClick={() => onToggle(c.id)}
            className={`whitespace-nowrap rounded-full border px-3 py-1.5 text-sm transition ${
              isSelected
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-background hover:bg-accent"
            } focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`}
            aria-pressed={isSelected}
            aria-label={`Filter by ${c.name}`}
          >
            {c.name}
          </button>
        );
      })}
    </div>
  );
};