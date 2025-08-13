"use client"

import { useState, useMemo, useEffect } from "react"
import { useSearchParams } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Loader2, Filter, X } from "lucide-react"
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer"
import { ProductFilters, type FilterState } from "@/modules/SNF/products-filter"
import { ActiveFilters } from "@/modules/SNF/active-filters"
import { ProductGrid } from "@/modules/SNF/components/ProductGrid"
import { useProducts } from "@/modules/SNF/hooks/useProducts"
import { productService } from "@/modules/SNF/services/api"
import { Header } from "@/modules/SNF/components/Header"
import { Footer } from "@/modules/SNF/components/Footer"
import { useDeliveryLocation } from "@/modules/SNF/hooks/useDeliveryLocation"
import type { Category, ProductWithPricing, DepotVariant } from "@/modules/SNF/types"

export default function CategoryProductsPage() {
  const [searchParams, setSearchParams] = useSearchParams()

  const [filters, setFilters] = useState<FilterState>({
    categories: [],
    brands: [],
    priceRange: [0, 10000],
    rating: 0,
    discount: 0,
    availability: [],
    searchQuery: "",
  })

  const [categories, setCategories] = useState<Category[]>([])
  const [isLoadingCategories, setIsLoadingCategories] = useState(true)
  const [isFiltersOpen, setIsFiltersOpen] = useState(false)
  const { currentDepotId } = useDeliveryLocation();

  // Fetch products using the real API
  const { products, isLoading: isLoadingProducts, error: productsError } = useProducts(currentDepotId)

  // Initialize filters from URL params
  useEffect(() => {
    const tagParam = searchParams.get('tag')
    console.log('URL tag parameter:', tagParam)
    if (tagParam && products.length > 0) {
      // Find the correct case version of the tag from available products
      const allTags = new Set<string>()
      products.forEach(p => {
        if (p.product.tags) {
          const tags = p.product.tags.split(',').map(tag => tag.trim())
          tags.forEach(tag => allTags.add(tag))
        }
      })

      // Find matching tag with correct case
      const matchingTag = Array.from(allTags).find(tag =>
        tag.toLowerCase() === tagParam.toLowerCase()
      )

      const tagToUse = matchingTag || tagParam
      console.log('Setting brand filter to:', tagToUse, '(original:', tagParam, ')')

      setFilters(prev => {
        const newFilters = {
          ...prev,
          brands: [tagToUse] // Use the correctly cased version
        }
        console.log('New filters after URL param:', newFilters)
        return newFilters
      })
    } else if (!tagParam) {
      // Clear brand filters if no tag param
      setFilters(prev => ({
        ...prev,
        brands: []
      }))
    }
  }, [searchParams, products])

  // Fetch categories on component mount
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setIsLoadingCategories(true)
        const categoriesData = await productService.getCategories()
        setCategories(categoriesData)
      } catch (error) {
        console.error('Failed to fetch categories:', error)
      } finally {
        setIsLoadingCategories(false)
      }
    }

    fetchCategories()
  }, [])

  // Extract unique brands and tags from products
  const availableBrands = useMemo(() => {
    const brands = new Set<string>()

    products.forEach(productWithPricing => {
      const product = productWithPricing.product

      // Add tags as brands/filters
      if (product.tags) {
        const tagArray = product.tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0)
        tagArray.forEach(tag => {
          brands.add(tag)
          // Debug logging for fruits
          if (tag.toLowerCase().includes('fruit')) {
            console.log(`Found fruit-related tag: "${tag}" in product: ${product.name}`)
          }
        })
      }

      // Add dairy status as filter options
      if (product.isDairyProduct) {
        brands.add('Contains Dairy')
      } else {
        brands.add('Non-Dairy')
      }

      // Extract potential brand from product name (first word)
      const firstWord = product.name.split(' ')[0]
      if (firstWord && firstWord.length > 2 && !firstWord.toLowerCase().includes('fresh')) {
        brands.add(firstWord)
      }

      // Add category as a filter option
      if (product.category?.name) {
        brands.add(product.category.name)
      }
    })

    const brandsArray = Array.from(brands).sort()
    console.log('Available brands/tags:', brandsArray)
    console.log('Fruits-related brands:', brandsArray.filter(b => b.toLowerCase().includes('fruit')))

    return brandsArray
  }, [products])

  // Filter products based on current filters
  const filteredProducts = useMemo(() => {
    console.log('Filtering products with filters:', filters)
    console.log('Total products to filter:', products.length)

    // Debug: show all products and their tags
    if (filters.brands.some(b => b.toLowerCase() === 'fruits')) {
      console.log('=== DEBUG: Fruits filter active ===')
      console.log('All products and their tags:')
      products.forEach((p, index) => {
        console.log(`${index + 1}. ${p.product.name}: tags="${p.product.tags}"`)
      })
      console.log('Current brand filters:', filters.brands)
      console.log('About to start filtering...')
    }

    const filtered = products.filter((productWithPricing) => {
      const product = productWithPricing.product

      // Category filter
      if (filters.categories.length > 0) {
        const categoryMatch = filters.categories.some(categoryName => {
          return product.category?.name === categoryName
        })
        if (!categoryMatch) return false
      }

      // Brand/Tag filter - check both product name and tags
      if (filters.brands.length > 0) {
        const brandMatch = filters.brands.some(brand => {
          const brandLower = brand.toLowerCase()

          if (brandLower === 'fruits') {
            console.log(`\n=== Checking product: ${product.name} ===`)
            console.log(`Brand filter: "${brand}" (lowercase: "${brandLower}")`)
          }

          // Check product name
          const nameMatch = product.name.toLowerCase().includes(brandLower)

          // Special handling for "Fruits" filter - match fruit-related products
          if (brandLower === 'fruits') {
            const fruitNames = ['orange', 'oranges', 'apple', 'apples', 'banana', 'bananas', 'mango', 'mangoes', 'grape', 'grapes', 'fruit']
            const isFruitProduct = fruitNames.some(fruitName =>
              product.name.toLowerCase().includes(fruitName)
            )

            console.log(`Name match: ${nameMatch}`)
            console.log(`Is fruit product (by name): ${isFruitProduct}`)

            if (isFruitProduct) {
              console.log(`✓ Matched as fruit product: ${product.name}`)
              return true
            }
          } else if (brandLower === 'fruits') {
            console.log(`Name match: ${nameMatch}`)
          }

          // Check tags (comma-separated)
          let tagMatch = false
          if (product.tags) {
            const productTags = product.tags.split(',').map(tag => tag.trim().toLowerCase())

            // Debug logging for fruits specifically
            if (brandLower === 'fruits' || brand.toLowerCase() === 'fruits') {
              console.log(`Product: ${product.name}`)
              console.log(`Raw tags: "${product.tags}"`)
              console.log(`Parsed tags:`, productTags)
              console.log(`Looking for brand: "${brand}" (lowercase: "${brandLower}")`)
            }

            tagMatch = productTags.some(tag => {
              // tag is already lowercase, brandLower is lowercase
              const exactMatch = tag === brandLower
              const containsMatch = tag.includes(brandLower) || brandLower.includes(tag)

              const matches = exactMatch || containsMatch

              if (brandLower === 'fruits' || brand.toLowerCase() === 'fruits') {
                console.log(`  Checking tag: "${tag}" against "${brandLower}"`)
                console.log(`    Exact match (${tag} === ${brandLower}): ${exactMatch}`)
                console.log(`    Contains match: ${containsMatch}`)
                console.log(`    Final result: ${matches}`)
              }

              return matches
            })
          }

          // Special handling for common tag variations
          if (brandLower === 'dairy' || brandLower === 'contains-dairy') {
            return product.isDairyProduct === true || tagMatch || nameMatch
          }
          if (brandLower === 'non-dairy') {
            return product.isDairyProduct === false || tagMatch || nameMatch
          }

          const finalMatch = nameMatch || tagMatch

          if (brandLower === 'fruits') {
            console.log(`Tag match: ${tagMatch}`)
            console.log(`Final match for ${product.name}: nameMatch=${nameMatch}, tagMatch=${tagMatch}, finalMatch=${finalMatch}`)
            console.log(`=== End ${product.name} ===\n`)
          }

          return finalMatch
        })
        if (!brandMatch) return false
      }

      // Price range filter
      const price = productWithPricing.buyOncePrice
      if (price < filters.priceRange[0] || price > filters.priceRange[1]) {
        return false
      }

      // Rating filter (using a default rating since we don't have ratings in the API)
      const defaultRating = 4.0 // Default rating for products
      if (filters.rating > 0 && defaultRating < filters.rating) {
        return false
      }

      // Discount filter
      if (filters.discount > 0) {
        const discountPercent = productWithPricing.discount ? productWithPricing.discount * 100 : 0
        if (discountPercent < filters.discount) {
          return false
        }
      }

      // Availability filter
      if (filters.availability.length > 0) {
        const hasInStock = filters.availability.includes("In Stock") && productWithPricing.inStock
        const hasSameDay = filters.availability.includes("Same Day Delivery") && productWithPricing.inStock
        const hasExpress = filters.availability.includes("Express Delivery") && productWithPricing.inStock
        const hasBulk = filters.availability.includes("Bulk Available") // Assuming all products have bulk available

        if (!hasInStock && !hasSameDay && !hasExpress && !hasBulk) {
          return false
        }
      }

      // Search query filter
      if (filters.searchQuery) {
        const searchLower = filters.searchQuery.toLowerCase()
        const nameMatch = product.name.toLowerCase().includes(searchLower)
        const descriptionMatch = product.description?.toLowerCase().includes(searchLower)
        const tagsMatch = product.tags?.toLowerCase().includes(searchLower)

        if (!nameMatch && !descriptionMatch && !tagsMatch) {
          return false
        }
      }

      return true
    })

    console.log(`Filtered ${filtered.length} products out of ${products.length}`)
    if (filters.brands.includes('Fruits') || filters.brands.includes('fruits')) {
      console.log('Products with Fruits filter:', filtered.map(p => ({
        name: p.product.name,
        tags: p.product.tags
      })))
    }

    return filtered
  }, [products, filters])

  // Update URL params when filters change
  const updateUrlParams = (newFilters: FilterState) => {
    const params = new URLSearchParams(searchParams)

    // Update tag param based on brands filter
    if (newFilters.brands.length > 0) {
      params.set('tag', newFilters.brands[0]) // Use first brand as tag
    } else {
      params.delete('tag')
    }

    setSearchParams(params)
  }

  const handleRemoveFilter = (type: string, value: string) => {
    let newFilters: FilterState

    switch (type) {
      case "category":
        newFilters = {
          ...filters,
          categories: filters.categories.filter((c) => c !== value),
        }
        break
      case "brand":
        newFilters = {
          ...filters,
          brands: filters.brands.filter((b) => b !== value),
        }
        break
      case "availability":
        newFilters = {
          ...filters,
          availability: filters.availability.filter((a) => a !== value),
        }
        break
      case "rating":
        newFilters = { ...filters, rating: 0 }
        break
      case "discount":
        newFilters = { ...filters, discount: 0 }
        break
      case "price":
        newFilters = { ...filters, priceRange: [0, 10000] }
        break
      case "search":
        newFilters = { ...filters, searchQuery: "" }
        break
      default:
        return
    }

    setFilters(newFilters)
    updateUrlParams(newFilters)
  }

  const handleClearAllFilters = () => {
    const newFilters = {
      categories: [],
      brands: [],
      priceRange: [0, 10000] as [number, number],
      rating: 0,
      discount: 0,
      availability: [],
      searchQuery: "",
    }
    setFilters(newFilters)
    updateUrlParams(newFilters)
  }

  const handleAddToCart = (product: ProductWithPricing, variant?: DepotVariant, qty?: number) => {
    // Simple add to cart handler - in a real app this would integrate with cart state
    console.log('Adding to cart:', {
      product: product.product.name,
      variant: variant?.name,
      quantity: qty || 1,
      price: variant?.buyOncePrice || product.buyOncePrice
    })

    // You can add toast notification here
    // toast.success(`Added ${product.product.name} to cart`)
  }

  // Show loading state
  if (isLoadingProducts || isLoadingCategories) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex items-center gap-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Loading products...</span>
        </div>
      </div>
    )
  }

  // Show error state
  if (productsError) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500 mb-4">Failed to load products</p>
          <Button onClick={() => window.location.reload()}>Retry</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div>
        <Header />
      </div>
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Filters Sidebar - Desktop */}
          <div className="hidden lg:block lg:w-80 flex-shrink-0">
            <ProductFilters
              filters={filters}
              onFiltersChange={(newFilters) => {
                setFilters(newFilters)
                updateUrlParams(newFilters)
              }}
              onClearAll={handleClearAllFilters}
              categories={categories}
              brands={availableBrands}
            />
          </div>

          {/* Main Content */}
          <div className="flex-1">
            {/* Mobile Filter Drawer */}
            <div className="lg:hidden mb-4">
              <Drawer open={isFiltersOpen} onOpenChange={setIsFiltersOpen}>
                <DrawerTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full flex items-center justify-center gap-2 h-12 border-2 hover:bg-accent/50 hover:border-primary/30 transition-all duration-200"
                  >
                    <Filter className="h-4 w-4" />
                    <span className="font-medium">Filters</span>
                    {(filters.brands.length > 0 || filters.categories.length > 0 || filters.availability.length > 0 || filters.rating > 0 || filters.discount > 0 || filters.searchQuery) && (
                      <span className="ml-1 bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded-full">
                        {[
                          ...filters.brands,
                          ...filters.categories,
                          ...filters.availability,
                          ...(filters.rating > 0 ? ['Rating'] : []),
                          ...(filters.discount > 0 ? ['Discount'] : []),
                          ...(filters.searchQuery ? ['Search'] : [])
                        ].length}
                      </span>
                    )}
                  </Button>
                </DrawerTrigger>
                <DrawerContent className="max-h-[90vh] flex flex-col">
                  {/* Header */}
                  <DrawerHeader className="text-left border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-primary/10">
                          <Filter className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <DrawerTitle className="text-lg font-semibold">
                            Filter Products
                          </DrawerTitle>
                          <DrawerDescription className="text-sm text-muted-foreground">
                            {filteredProducts.length} of {products.length} products
                          </DrawerDescription>
                        </div>
                      </div>
                      {/* Active filters count */}
                      {(filters.brands.length > 0 || filters.categories.length > 0 || filters.availability.length > 0 || filters.rating > 0 || filters.discount > 0 || filters.searchQuery) && (
                        <Badge variant="secondary" className="text-xs">
                          {[
                            ...filters.brands,
                            ...filters.categories,
                            ...filters.availability,
                            ...(filters.rating > 0 ? ['Rating'] : []),
                            ...(filters.discount > 0 ? ['Discount'] : []),
                            ...(filters.searchQuery ? ['Search'] : [])
                          ].length} active
                        </Badge>
                      )}
                    </div>
                  </DrawerHeader>

                  {/* Scrollable Content */}
                  <div className="flex-1 overflow-y-auto">
                    <div className="p-4 space-y-6">
                      <ProductFilters
                        filters={filters}
                        onFiltersChange={(newFilters) => {
                          setFilters(newFilters)
                          updateUrlParams(newFilters)
                        }}
                        onClearAll={handleClearAllFilters}
                        categories={categories}
                        brands={availableBrands}
                      />
                    </div>
                  </div>

                  {/* Footer with Actions */}
                  <DrawerFooter className="border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 p-4">
                    <div className="flex flex-col gap-3">
                      {/* Quick Clear All Button */}
                      {(filters.brands.length > 0 || filters.categories.length > 0 || filters.availability.length > 0 || filters.rating > 0 || filters.discount > 0 || filters.searchQuery) && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleClearAllFilters}
                          className="self-start text-muted-foreground hover:text-foreground"
                        >
                          Clear all filters
                        </Button>
                      )}

                      {/* Main Action Buttons */}
                      <div className="flex gap-3">
                        <DrawerClose asChild>
                          <Button variant="outline" className="flex-1" size="lg">
                            Cancel
                          </Button>
                        </DrawerClose>
                        <DrawerClose asChild>
                          <Button
                            className="flex-1"
                            size="lg"
                            onClick={() => setIsFiltersOpen(false)}
                          >
                            Show {filteredProducts.length} Products
                          </Button>
                        </DrawerClose>
                      </div>
                    </div>
                  </DrawerFooter>
                </DrawerContent>
              </Drawer>
            </div>



            {/* Active Filters */}
            <ActiveFilters filters={filters} onRemoveFilter={handleRemoveFilter} onClearAll={handleClearAllFilters} />

            {/* Results Header */}
            <div className="flex items-center justify-between mb-6 mt-4">
              <div>
                <h1 className="text-2xl font-bold">Products ({filteredProducts.length})</h1>
                {searchParams.get('tag') && (
                  <p className="text-sm text-muted-foreground mt-1">
                    Filtered by tag: <span className="font-medium">{searchParams.get('tag')}</span>
                  </p>
                )}
              </div>
            </div>

            {/* Products Grid */}
            <ProductGrid
              products={filteredProducts}
              onAddToCart={handleAddToCart}
              isLoading={isLoadingProducts}
            // showVariants={false}
            />

            {filteredProducts.length === 0 && (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No products found matching your filters.</p>
                <Button variant="outline" onClick={handleClearAllFilters} className="mt-4 bg-transparent">
                  Clear All Filters
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
      <Footer />
    </div>
  )
}
