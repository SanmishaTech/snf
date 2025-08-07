import { ProductService, Product, DepotVariant, ApiResponse, PaginatedResponse } from '../types';

/**
 * API service layer for fetching products and depot variants
 * Uses only MRP pricing from depot variants as specified
 */
export class ProductServiceImpl implements ProductService {
  private readonly API_BASE_URL = import.meta.env.VITE_BACKEND_URL || '/api';
  private readonly DEFAULT_TIMEOUT = 10000; // 10 seconds
  private readonly MAX_RETRIES = 2;

  /**
   * Get public products with optional depot filtering
   */
  async getProducts(depotId?: number): Promise<Product[]> {
    try {
      const url = new URL(`${this.API_BASE_URL}/products/public`);
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

      return result.data;
    } catch (error) {
      console.error('Error fetching products:', error);
      throw error;
    }
  }

  /**
   * Get product variants for a specific product and depot
   */
  async getProductVariants(productId: number, depotId: number): Promise<DepotVariant[]> {
    try {
      const url = new URL(`${this.API_BASE_URL}/public/depot-variants/${productId}`);
      url.searchParams.append('depotId', depotId.toString());

      const response = await this.fetchWithRetry(url.toString());
      
      if (!response.ok) {
        if (response.status === 404) {
          return []; // No variants found
        }
        throw new Error(`API request failed: ${response.status}`);
      }

      const result: ApiResponse<any[]> = await response.json();
      
      if (!result.success || !result.data) {
        return [];
      }

      // Transform the API response to match our DepotVariant interface
      return result.data.map((variant: any) => ({
        id: variant.id,
        depotId: variant.depotId || variant.depot?.id,
        productId: variant.productId || variant.product?.id,
        name: variant.name,
        hsnCode: variant.hsnCode,
        minimumQty: variant.minimumQty || 1,
        closingQty: variant.closingQty || 0,
        notInStock: variant.notInStock || false,
        isHidden: variant.isHidden || false,
        buyOncePrice: variant.buyOncePrice,
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
      console.error('Error fetching product variants:', error);
      throw error;
    }
  }

  /**
   * Get all depot variants for a specific depot
   */
  async getDepotVariants(depotId: number): Promise<DepotVariant[]> {
    try {
      const url = new URL(`${this.API_BASE_URL}/public/depots/${depotId}/variants`);

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

      // Handle both array and object response formats
      const variants = Array.isArray(result.data) ? result.data : result.data.variants || [];
      
      return variants.map((variant: any) => ({
        id: variant.id,
        depotId: variant.depotId || variant.depot?.id,
        productId: variant.productId || variant.product?.id,
        name: variant.name,
        hsnCode: variant.hsnCode,
        minimumQty: variant.minimumQty || 1,
        closingQty: variant.closingQty || 0,
        notInStock: variant.notInStock || false,
        isHidden: variant.isHidden || false,
        buyOncePrice: variant.buyOncePrice,
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
      console.error('Error fetching depot variants:', error);
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
        buyOncePrice: variant.buyOncePrice,
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
      const url = new URL(`${this.API_BASE_URL}/products/public`);

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
      const url = new URL(`${this.API_BASE_URL}/products/public`);
      url.searchParams.append('categoryId', categoryId.toString());
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

      return result.data;
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
      const url = new URL(`${this.API_BASE_URL}/products/public`);
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

      return result.data;
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
      const url = new URL(`${this.API_BASE_URL}/products/${productId}`);

      const response = await this.fetchWithRetry(url.toString());
      
      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }
        throw new Error(`API request failed: ${response.status}`);
      }

      const result: ApiResponse<Product> = await response.json();
      
      if (!result.success || !result.data) {
        return null;
      }

      return result.data;
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
      const url = new URL(`${this.API_BASE_URL}/products/batch`);
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
      const url = new URL(`${this.API_BASE_URL}/categories/public`);

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
      throw error;
    }
  }
}

// Export singleton instance
export const productService = new ProductServiceImpl();