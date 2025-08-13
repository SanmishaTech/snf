"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Badge } from "@/components/ui/badge"
import { Filter, Search } from "lucide-react"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { ChevronDown } from "lucide-react"

export interface FilterState {
  categories: string[]
  brands: string[]
  priceRange: [number, number]
  rating: number
  discount: number
  availability: string[]
  searchQuery: string
}

interface ProductFiltersProps {
  filters: FilterState
  onFiltersChange: (filters: FilterState) => void
  onClearAll: () => void
  categories?: Array<{ id: number; name: string }>
  brands?: string[]
}

const defaultCategories = [
  "Fruits & Vegetables",
  "Dairy & Eggs",
  "Meat & Seafood",
  "Bakery",
  "Beverages",
  "Snacks",
  "Frozen Foods",
  "Personal Care",
  "Household",
  "Baby Care",
]

const defaultBrands = [
  "Amul",
  "Britannia",
  "Nestle",
  "ITC",
  "Parle",
  "Haldiram's",
  "MTR",
  "Organic India",
  "24 Mantra",
  "Fresho",
]



export function ProductFilters({ filters, onFiltersChange, onClearAll, categories, brands }: ProductFiltersProps) {
  // Use provided categories and brands or fall back to defaults
  const categoryList = categories?.map(cat => cat.name) || defaultCategories
  const brandList = brands || defaultBrands
  const [openSections, setOpenSections] = useState({
    categories: true,
    brands: true,
    price: true,
    rating: true,
    discount: false,
    availability: false,
  })

  const toggleSection = (section: keyof typeof openSections) => {
    setOpenSections((prev) => ({ ...prev, [section]: !prev[section] }))
  }

  const handleCategoryChange = (category: string, checked: boolean) => {
    const newCategories = checked ? [...filters.categories, category] : filters.categories.filter((c) => c !== category)
    onFiltersChange({ ...filters, categories: newCategories })
  }

  const handleBrandChange = (brand: string, checked: boolean) => {
    const newBrands = checked ? [...filters.brands, brand] : filters.brands.filter((b) => b !== brand)
    onFiltersChange({ ...filters, brands: newBrands })
  }



  const activeFiltersCount =
    filters.categories.length +
    filters.brands.length +
    filters.availability.length +
    (filters.rating > 0 ? 1 : 0) +
    (filters.discount > 0 ? 1 : 0) +
    (filters.priceRange[0] > 0 || filters.priceRange[1] < 10000 ? 1 : 0)

  return (
    <Card className="w-full max-w-sm">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
            {activeFiltersCount > 0 && (
              <Badge variant="secondary" className="ml-2">
                {activeFiltersCount}
              </Badge>
            )}
          </CardTitle>
          {activeFiltersCount > 0 && (
            <Button variant="ghost" size="sm" onClick={onClearAll}>
              Clear All
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Search */}
        <div className="space-y-2">
          <Label htmlFor="search">Search Products</Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="search"
              placeholder="Search for products..."
              value={filters.searchQuery}
              onChange={(e) => onFiltersChange({ ...filters, searchQuery: e.target.value })}
              className="pl-10"
            />
          </div>
        </div>

        {/* Categories */}
        <Collapsible open={openSections.categories} onOpenChange={() => toggleSection("categories")}>
          <CollapsibleTrigger className="flex w-full items-center justify-between py-2">
            <Label className="text-sm font-medium">Categories</Label>
            <ChevronDown className={`h-4 w-4 transition-transform ${openSections.categories ? "rotate-180" : ""}`} />
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-3 pt-2">
            <div className="max-h-48 overflow-y-auto space-y-2">
              {categoryList.map((category) => (
                <div key={category} className="flex items-center space-x-2">
                  <Checkbox
                    id={`category-${category}`}
                    checked={filters.categories.includes(category)}
                    onCheckedChange={(checked) => handleCategoryChange(category, checked as boolean)}
                    className="h-4 w-4 md:h-5 md:w-5"
                  />
                  <Label htmlFor={`category-${category}`} className="text-sm font-normal">
                    {category}
                  </Label>
                </div>
              ))}
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Price Range */}
        <Collapsible open={openSections.price} onOpenChange={() => toggleSection("price")}>
          <CollapsibleTrigger className="flex w-full items-center justify-between py-2">
            <Label className="text-sm font-medium">Price Range</Label>
            <ChevronDown className={`h-4 w-4 transition-transform ${openSections.price ? "rotate-180" : ""}`} />
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-4 pt-2">
            <div className="space-y-4">
              {/* Manual Input Fields */}
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <Label htmlFor="min-price" className="text-xs text-muted-foreground">Min</Label>
                  <Input
                    id="min-price"
                    type="number"
                    placeholder="0"
                    value={filters.priceRange[0] || ''}
                    onChange={(e) => {
                      const minValue = Math.max(0, parseInt(e.target.value) || 0);
                      const maxValue = Math.max(minValue, filters.priceRange[1]);
                      onFiltersChange({ ...filters, priceRange: [minValue, maxValue] });
                    }}
                    className="h-8 text-sm"
                  />
                </div>
                <span className="text-muted-foreground mt-4">-</span>
                <div className="flex-1">
                  <Label htmlFor="max-price" className="text-xs text-muted-foreground">Max</Label>
                  <Input
                    id="max-price"
                    type="number"
                    placeholder="10000"
                    value={filters.priceRange[1] || ''}
                    onChange={(e) => {
                      const maxValue = Math.min(10000, parseInt(e.target.value) || 10000);
                      const minValue = Math.min(maxValue, filters.priceRange[0]);
                      onFiltersChange({ ...filters, priceRange: [minValue, maxValue] });
                    }}
                    className="h-8 text-sm"
                  />
                </div>
              </div>

              {/* Slider */}
              <div className="px-2">
                <Slider
                  value={filters.priceRange}
                  onValueChange={(value) => onFiltersChange({ ...filters, priceRange: value as [number, number] })}
                  max={10000}
                  min={0}
                  step={50}
                  className="w-full"
                />
                <div className="flex justify-between text-sm text-muted-foreground mt-2">
                  <span>₹{filters.priceRange[0]}</span>
                  <span>₹{filters.priceRange[1]}</span>
                </div>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Brands */}
        <Collapsible open={openSections.brands} onOpenChange={() => toggleSection("brands")}>
          <CollapsibleTrigger className="flex w-full items-center justify-between py-2">
            <Label className="text-sm font-medium">Tags</Label>
            <ChevronDown className={`h-4 w-4 transition-transform ${openSections.brands ? "rotate-180" : ""}`} />
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-3 pt-2">
            <div className="max-h-48 overflow-y-auto space-y-2">
              {brandList.map((brand) => (
                <div key={brand} className="flex items-center space-x-2">
                  <Checkbox
                    id={`brand-${brand}`}
                    checked={filters.brands.includes(brand)}
                    onCheckedChange={(checked) => handleBrandChange(brand, checked as boolean)}
                    className="h-4 w-4 md:h-5 md:w-5"
                  />
                  <Label htmlFor={`brand-${brand}`} className="text-sm font-normal">
                    {brand}
                  </Label>
                </div>
              ))}
            </div>
          </CollapsibleContent>
        </Collapsible>


      </CardContent>
    </Card>
  )
}
