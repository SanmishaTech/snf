"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { X } from "lucide-react"
import type { FilterState } from "./products-filter"

interface ActiveFiltersProps {
  filters: FilterState
  onRemoveFilter: (type: string, value: string) => void
  onClearAll: () => void
}

export function ActiveFilters({ filters, onRemoveFilter, onClearAll }: ActiveFiltersProps) {
  const hasActiveFilters =
    filters.categories.length > 0 ||
    filters.brands.length > 0 ||
    filters.availability.length > 0 ||
    filters.rating > 0 ||
    filters.discount > 0 ||
    filters.priceRange[0] > 0 ||
    filters.priceRange[1] < 10000 ||
    filters.searchQuery.length > 0

  if (!hasActiveFilters) return null

  return (
    <div className="flex flex-wrap items-center gap-2 p-4 bg-muted/50 rounded-lg">
      <span className="text-sm font-medium text-muted-foreground">Active filters:</span>

      {filters.searchQuery && (
        <Badge variant="secondary" className="gap-1">
          Search: "{filters.searchQuery}"
          <Button variant="ghost" size="sm" className="h-auto p-0 ml-1" onClick={() => onRemoveFilter("search", "")}>
            <X className="h-3 w-3" />
          </Button>
        </Badge>
      )}

      {filters.categories.map((category) => (
        <Badge key={category} variant="secondary" className="gap-1">
          {category}
          <Button
            variant="ghost"
            size="sm"
            className="h-auto p-0 ml-1"
            onClick={() => onRemoveFilter("category", category)}
          >
            <X className="h-3 w-3" />
          </Button>
        </Badge>
      ))}

      {filters.brands.map((brand) => (
        <Badge key={brand} variant="secondary" className="gap-1">
          {brand}
          <Button variant="ghost" size="sm" className="h-auto p-0 ml-1" onClick={() => onRemoveFilter("brand", brand)}>
            <X className="h-3 w-3" />
          </Button>
        </Badge>
      ))}

      {filters.availability.map((option) => (
        <Badge key={option} variant="secondary" className="gap-1">
          {option}
          <Button
            variant="ghost"
            size="sm"
            className="h-auto p-0 ml-1"
            onClick={() => onRemoveFilter("availability", option)}
          >
            <X className="h-3 w-3" />
          </Button>
        </Badge>
      ))}

      {filters.rating > 0 && (
        <Badge variant="secondary" className="gap-1">
          {filters.rating}+ ⭐
          <Button variant="ghost" size="sm" className="h-auto p-0 ml-1" onClick={() => onRemoveFilter("rating", "")}>
            <X className="h-3 w-3" />
          </Button>
        </Badge>
      )}

      {filters.discount > 0 && (
        <Badge variant="secondary" className="gap-1">
          {filters.discount}% off
          <Button variant="ghost" size="sm" className="h-auto p-0 ml-1" onClick={() => onRemoveFilter("discount", "")}>
            <X className="h-3 w-3" />
          </Button>
        </Badge>
      )}

      {(filters.priceRange[0] > 0 || filters.priceRange[1] < 10000) && (
        <Badge variant="secondary" className="gap-1">
          ₹{filters.priceRange[0]} - ₹{filters.priceRange[1]}
          <Button variant="ghost" size="sm" className="h-auto p-0 ml-1" onClick={() => onRemoveFilter("price", "")}>
            <X className="h-3 w-3" />
          </Button>
        </Badge>
      )}

      <Button variant="outline" size="sm" onClick={onClearAll} className="ml-2 bg-transparent">
        Clear All
      </Button>
    </div>
  )
}
