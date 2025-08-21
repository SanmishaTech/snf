import { ProductService, Product, DepotVariant, ApiResponse, PaginatedResponse } from '../types';

/**
 * API service layer for fetching products and depot variants
 * Uses only MRP pricing from depot variants as specified
 * Includes a simple cache to avoid redundant API calls within a short timeframe
 */
export class ProductServiceImpl implements ProductService {
  private readonly API_BASE_URL = import.meta.env.VITE_BACKEND_URL || '/api';
  private readonly DEFAULT_TIMEOUT = 10000; // 10 seconds
  private readonly MAX_RETRIES = 2;
  private cache: { [key: string]: { timestamp: number; data: any } } = {};
  private readonly CACHE_TTL = 2000; // 2 seconds

  private getCacheKey(depotId?: number): string {
    return `depot-${depotId || 'all'}`;
  }

  private getFromCache(key: string): any | null {
    const cached = this.cache[key];
    if (cached && (Date.now() - cached.timestamp < this.CACHE_TTL)) {
      return cached.data;
    }
    return null;
  }

  private setCache(key: string, data: any): void {
    this.cache[key] = { timestamp: Date.now(), data };
  }

  public invalidateCache(depotId?: number): void {
    const key = this.getCacheKey(depotId);
    console.log(`[Cache] Invalidating cache for key: ${key}`);
    delete this.cache[key];
  }

  /**
   * Get public products with optional depot filtering
   */
  async getProducts(depotId?: number): Promise<Product[]> {
    const cacheKey = this.getCacheKey(depotId);
    const cachedData = this.getFromCache(cacheKey);
    if (cachedData) {
      console.log(`[Cache] Returning cached products for depot ${depotId}`);
      return cachedData.products;
    }

    try {
      const url = new URL(`${this.API_BASE_URL}/api/products/public`);
      if (depotId) {
        url.searchParams.append('depotId', depotId.toString());
      }

      const response = await this.fetchWithRetry(url.toString());
      
      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
      }

      const result: ApiResponse<any> = await response.json();
      
      if (!result.success || !result.data) {
        return [];
      }

      let products: Product[] = [];
      if (Array.isArray(result.data)) {
        // Strip out variants array from each product to get clean product objects
        products = result.data.map((product: any) => {
          const { variants, ...cleanProduct } = product;
          return cleanProduct;
        });
      } else if (result.data.products && Array.isArray(result.data.products)) {
        // Strip out variants array from each product to get clean product objects
        products = result.data.products.map((product: any) => {
          const { variants, ...cleanProduct } = product;
          return cleanProduct;
        });
      }

      this.setCache(cacheKey, { products, variants: [] }); // Store products in cache

      return products;
    } catch (error) {
      console.error('Error fetching products:', error);
      throw error;
    }
  }

  /**
   * Get all depot variants for a specific depot
   */
  async getDepotVariants(depotId: number): Promise<DepotVariant[]> {
    try {
      // Use the correct endpoint that returns products with variants
      const url = new URL(`${this.API_BASE_URL}/api/products/public`);
      url.searchParams.append('depotId', depotId.toString());

      const response = await this.fetchWithRetry(url.toString());
      
      if (!response.ok) {
        if (response.status === 404) {
          return []; // No variants found
        }
        throw new Error(`API request failed: ${response.status}`);
      }

      const result: ApiResponse<any> = await response.json();
      
      if (!result.success || !result.data) {
        return [];
      }

      // Handle the response format from getPublicProductsWithVariants
      let allVariants: any[] = [];
      
      if (Array.isArray(result.data)) {
        // Direct array of products with variants
        result.data.forEach((product: any) => {
          // Allow all products for now
          if (product.variants && Array.isArray(product.variants)) {
            // Add product reference to each variant
            const variantsWithProduct = product.variants.map((variant: any) => ({
              ...variant,
              product: {
                id: product.id,
                name: product.name,
                description: product.description,
                attachmentUrl: product.attachmentUrl,
                url: product.url,
                isDairyProduct: product.isDairyProduct,
                maintainStock: product.maintainStock,
                categoryId: product.categoryId,
                category: product.category,
                createdAt: product.createdAt,
                updatedAt: product.updatedAt,
              }
            }));
            allVariants = [...allVariants, ...variantsWithProduct];
          }
        });
      } else if (result.data.products && Array.isArray(result.data.products)) {
        // Object with depot and products structure
        result.data.products.forEach((product: any) => {
          // Allow all products for now
          if (product.variants && Array.isArray(product.variants)) {
            // Add product reference to each variant
            const variantsWithProduct = product.variants.map((variant: any) => ({
              ...variant,
              product: {
                id: product.id,
                name: product.name,
                description: product.description,
                attachmentUrl: product.attachmentUrl,
                url: product.url,
                isDairyProduct: product.isDairyProduct,
                maintainStock: product.maintainStock,
                categoryId: product.categoryId,
                category: product.category,
                createdAt: product.createdAt,
                updatedAt: product.updatedAt,
              }
            }));
            allVariants = [...allVariants, ...variantsWithProduct];
          }
        });
      }
      
      return allVariants.map((variant: any) => ({
        id: variant.id,
        depotId: depotId,
        productId: variant.product?.id || variant.productId,
        name: variant.name,
        hsnCode: variant.hsnCode,
        minimumQty: variant.minimumQty || 1,
        closingQty: variant.closingQty || 0,
        notInStock: variant.notInStock || false,
        isHidden: variant.isHidden || false,
        buyOncePrice: variant.buyOncePrice ? parseFloat(variant.buyOncePrice) : undefined,
        price15Day: variant.price15Day ? parseFloat(variant.price15Day) : undefined,
        price1Month: variant.price1Month ? parseFloat(variant.price1Month) : undefined,
        price3Day: variant.price3Day ? parseFloat(variant.price3Day) : undefined,
        price7Day: variant.price7Day ? parseFloat(variant.price7Day) : undefined,
        mrp: parseFloat(variant.mrp) || 0,
        purchasePrice: variant.purchasePrice ? parseFloat(variant.purchasePrice) : undefined,
        createdAt: new Date(variant.createdAt || Date.now()),
        updatedAt: new Date(variant.updatedAt || Date.now()),
        depot: variant.depot,
        product: variant.product,
      }));
    } catch (error) {
      console.error('Error fetching depot variants:', error);
      throw error;
    }
  }

  /**
   * Get depot variants for a specific product and depot
   */
  async getProductVariants(productId: number, depotId: number): Promise<DepotVariant[]> {
    try {
      // Get all depot variants for the depot, then filter by product ID
      const allVariants = await this.getDepotVariants(depotId);
      return allVariants.filter(variant => variant.productId === productId);
    } catch (error) {
      console.error('Error fetching product variants:', error);
      throw error;
    }
  }

  /**
   * Get all depot variants across all depots
   */
  async getAllDepotVariants(): Promise<DepotVariant[]> {
    try {
      const url = new URL(`${this.API_BASE_URL}/public/depot-variants`);

      const response = await this.fetchWithRetry(url.toString());
      
      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
      }

      const result: ApiResponse<any> = await response.json();
      
      if (!result.success || !result.data) {
        return [];
      }

      // Handle the grouped response format
      let allVariants: any[] = [];
      
      if (Array.isArray(result.data)) {
        allVariants = result.data;
      } else if (result.data.depot && result.data.products) {
        // Handle grouped by depot format
        result.data.forEach((depotData: any) => {
          if (depotData.products) {
            depotData.products.forEach((productData: any) => {
              if (productData.variants) {
                allVariants = [...allVariants, ...productData.variants];
              }
            });
          }
        });
      }

      return allVariants.map((variant: any) => ({
        id: variant.id,
        depotId: variant.depotId || variant.depot?.id,
        productId: variant.productId || variant.product?.id,
        name: variant.name,
        hsnCode: variant.hsnCode,
        minimumQty: variant.minimumQty || 1,
        closingQty: variant.closingQty || 0,
        notInStock: variant.notInStock || false,
        isHidden: variant.isHidden || false,
        buyOncePrice: variant.buyOncePrice ? parseFloat(variant.buyOncePrice) : undefined,
        price15Day: variant.price15Day,
        price1Month: variant.price1Month,
        price3Day: variant.price3Day,
        price7Day: variant.price7Day,
        mrp: variant.mrp || variant.price || 0,
        purchasePrice: variant.purchasePrice,
        createdAt: variant.createdAt || new Date(),
        updatedAt: variant.updatedAt || new Date(),
        depot: variant.depot,
        product: variant.product,
      }));
    } catch (error) {
      console.error('Error fetching all depot variants:', error);
      throw error;
    }
  }

  /**
   * Get public products without depot filtering
   */
  async getPublicProducts(): Promise<Product[]> {
    try {
      const url = new URL(`${this.API_BASE_URL}/api/products/public`);

      const response = await this.fetchWithRetry(url.toString());
      
      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
      }

      const result: ApiResponse<Product[]> = await response.json();
      
      if (!result.success || !result.data) {
        return [];
      }

      return result.data;
    } catch (error) {
      console.error('Error fetching public products:', error);
      throw error;
    }
  }

  /**
   * Get products by category
   */
  async getProductsByCategory(categoryId: number, depotId?: number): Promise<Product[]> {
    try {
      const url = new URL(`${this.API_BASE_URL}/api/products/public`);
      // Backend may ignore categoryId; we still send it for forward compatibility
      url.searchParams.append('categoryId', categoryId.toString());
      if (depotId) {
        url.searchParams.append('depotId', depotId.toString());
      }

      const response = await this.fetchWithRetry(url.toString());
      
      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
      }

      const result: ApiResponse<any> = await response.json();
      
      if (!result.success || !result.data) {
        return [];
      }

      // Normalize possible shapes then filter by categoryId client-side
      const rawProducts: any[] = Array.isArray(result.data)
        ? result.data
        : Array.isArray((result.data as any).products)
          ? (result.data as any).products
          : [];

      return rawProducts.filter((p: any) => {
        const pid = p?.categoryId;
        const pcid = p?.category?.id;
        return pid === categoryId || pcid === categoryId;
      });
    } catch (error) {
      console.error('Error fetching products by category:', error);
      throw error;
    }
  }

  /**
   * Search products by name or description
   */
  async searchProducts(query: string, depotId?: number): Promise<Product[]> {
    try {
      const url = new URL(`${this.API_BASE_URL}/api/products/public`);
      url.searchParams.append('search', query);
      if (depotId) {
        url.searchParams.append('depotId', depotId.toString());
      }

      const response = await this.fetchWithRetry(url.toString());
      
      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
      }

      const result: ApiResponse<Product[]> = await response.json();
      
      if (!result.success || !result.data) {
        return [];
      }

      return (result.data as any[]);
    } catch (error) {
      console.error('Error searching products:', error);
      throw error;
    }
  }

  /**
   * Get product by ID
   */
  async getProductById(productId: number): Promise<Product | null> {
    try {
      const url = new URL(`${this.API_BASE_URL}/api/products/${productId}`);

      const response = await this.fetchWithRetry(url.toString());
      
      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }
        throw new Error(`API request failed: ${response.status}`);
      }

      const result = await response.json();
      
      // Handle both wrapped response format {success: true, data: {...}}
      // and direct response format {...}
      if (result && typeof result === 'object') {
        if (result.success && result.data) {
          // Wrapped format
          return result.data as any;
        } else if (result.id) {
          // Direct format - the API returns the product directly
          return result as any;
        }
      }

      return null;
    } catch (error) {
      console.error('Error fetching product by ID:', error);
      throw error;
    }
  }

  /**
   * Batch fetch products by IDs
   */
  async batchGetProducts(productIds: number[]): Promise<Product[]> {
    if (productIds.length === 0) {
      return [];
    }

    try {
      const url = new URL(`${this.API_BASE_URL}/api/products/batch`);
      const response = await this.fetchWithRetry(url.toString(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ productIds }),
      });
      
      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
      }

      const result: ApiResponse<Product[]> = await response.json();
      
      if (!result.success || !result.data) {
        return [];
      }

      return result.data;
    } catch (error) {
      console.error('Error batch fetching products:', error);
      throw error;
    }
  }

  /**
   * Fetch with retry mechanism
   */
  private async fetchWithRetry(url: string, options?: RequestInit): Promise<Response> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= this.MAX_RETRIES; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.DEFAULT_TIMEOUT);

        const response = await fetch(url, {
          ...options,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);
        return response;
      } catch (error) {
        lastError = error as Error;
        
        if (attempt === this.MAX_RETRIES) {
          break;
        }

        // Wait before retrying (exponential backoff)
        const delay = Math.pow(2, attempt) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw lastError || new Error('Max retries exceeded');
  }

  /**
   * Extract unit information from variant name
   */
  private extractUnitFromName(name: string): string {
    // Common patterns for unit extraction
    const patterns = [
      /(\d+)\s*(ml|ML|milliliter|milliliters)/i,
      /(\d+)\s*(l|L|liter|liters)/i,
      /(\d+)\s*(g|G|gram|grams)/i,
      /(\d+)\s*(kg|KG|kilogram|kilograms)/i,
      /(\d+)\s*(pcs|PC|pieces)/i,
      /(\d+)\s*(pack|Pack|PACK)/i,
    ];

    for (const pattern of patterns) {
      const match = name.match(pattern);
      if (match) {
        return match[2].toLowerCase();
      }
    }

    // Default fallbacks based on common naming conventions
    if (name.toLowerCase().includes('500ml')) return '500ml';
    if (name.toLowerCase().includes('1l')) return '1l';
    if (name.toLowerCase().includes('1kg')) return '1kg';
    if (name.toLowerCase().includes('500g')) return '500g';

    return 'unit';
  }

  /**
   * Get categories
   */
  async getCategories(): Promise<any[]> {
    try {
      const url = new URL(`${this.API_BASE_URL}/api/admin/categories/public/AllCategories`);

      const response = await this.fetchWithRetry(url.toString());
      
      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
      }

      const result: ApiResponse<any[]> = await response.json();
      
      if (!result.success || !result.data) {
        return [];
      }

      return result.data;
    } catch (error) {
      console.error('Error fetching categories:', error);
      // Return empty array on error instead of throwing
      return [];
    }
  }
}

// Export singleton instance
export const productService = new ProductServiceImpl();