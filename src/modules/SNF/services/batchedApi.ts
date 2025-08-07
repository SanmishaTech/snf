import { Depot, Product, DepotVariant, ApiResponse } from '../types';

/**
 * Batched API service for efficient data fetching
 * Combines multiple API calls into single requests where possible
 */
export class BatchedApiService {
  private API_BASE_URL = '/api';
  private pendingRequests: Map<string, Promise<any>> = new Map();
  private batchTimeout: number | null = null;
  private batchQueue: Array<{
    key: string;
    resolve: (value: any) => void;
    reject: (reason?: any) => void;
    request: () => Promise<any>;
  }> = [];

  /**
   * Batch multiple product requests into a single API call
   */
  async batchGetProducts(productIds: number[]): Promise<Product[]> {
    if (productIds.length === 0) {
      return [];
    }

    if (productIds.length === 1) {
      // Single product request
      return this.getSingleProduct(productIds[0]);
    }

    // Batch request for multiple products
    const cacheKey = `batch_products_${productIds.sort().join('_')}`;
    
    // Check cache first
    const cached = this.getCachedData(cacheKey);
    if (cached) {
      return cached;
    }

    // Check if there's already a pending request for this batch
    if (this.pendingRequests.has(cacheKey)) {
      return this.pendingRequests.get(cacheKey);
    }

    const requestPromise = this.executeBatchedRequest(
      `${this.API_BASE_URL}/public/products/batch`,
      { productIds },
      cacheKey,
      30 * 60 * 1000 // 30 minutes cache
    );

    this.pendingRequests.set(cacheKey, requestPromise);
    
    try {
      const result = await requestPromise;
      return result;
    } finally {
      this.pendingRequests.delete(cacheKey);
    }
  }

  /**
   * Batch multiple depot variant requests into a single API call
   */
  async batchGetDepotVariants(depotId: number, productIds: number[]): Promise<DepotVariant[]> {
    if (productIds.length === 0) {
      return [];
    }

    const cacheKey = `batch_variants_${depotId}_${productIds.sort().join('_')}`;
    
    // Check cache first
    const cached = this.getCachedData(cacheKey);
    if (cached) {
      return cached;
    }

    // Check if there's already a pending request
    if (this.pendingRequests.has(cacheKey)) {
      return this.pendingRequests.get(cacheKey);
    }

    const requestPromise = this.executeBatchedRequest(
      `${this.API_BASE_URL}/public/depot-variants/batch`,
      { depotId, productIds },
      cacheKey,
      15 * 60 * 1000 // 15 minutes cache
    );

    this.pendingRequests.set(cacheKey, requestPromise);
    
    try {
      const result = await requestPromise;
      return result;
    } finally {
      this.pendingRequests.delete(cacheKey);
    }
  }

  /**
   * Get products and their variants in a single batched request
   */
  async batchGetProductsWithVariants(depotId: number, productIds: number[]): Promise<{
    products: Product[];
    variants: DepotVariant[];
  }> {
    if (productIds.length === 0) {
      return { products: [], variants: [] };
    }

    const cacheKey = `batch_products_variants_${depotId}_${productIds.sort().join('_')}`;
    
    // Check cache first
    const cached = this.getCachedData(cacheKey);
    if (cached) {
      return cached;
    }

    // Check if there's already a pending request
    if (this.pendingRequests.has(cacheKey)) {
      return this.pendingRequests.get(cacheKey);
    }

    const requestPromise = this.executeBatchedRequest(
      `${this.API_BASE_URL}/public/products-with-variants/batch`,
      { depotId, productIds },
      cacheKey,
      15 * 60 * 1000 // 15 minutes cache
    );

    this.pendingRequests.set(cacheKey, requestPromise);
    
    try {
      const result = await requestPromise;
      return result;
    } finally {
      this.pendingRequests.delete(cacheKey);
    }
  }

  /**
   * Get all products for a depot with optimized pagination
   */
  async getAllDepotProducts(depotId: number, options: {
    page?: number;
    limit?: number;
    category?: string;
    search?: string;
  } = {}): Promise<{
    products: Product[];
    variants: DepotVariant[];
    total: number;
    hasMore: boolean;
  }> {
    const { page = 1, limit = 50, category, search } = options;
    const cacheKey = `depot_products_${depotId}_page${page}_limit${limit}_${category || ''}_${search || ''}`;
    
    // Check cache first
    const cached = this.getCachedData(cacheKey);
    if (cached) {
      return cached;
    }

    // Check if there's already a pending request
    if (this.pendingRequests.has(cacheKey)) {
      return this.pendingRequests.get(cacheKey);
    }

    const queryParams = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });

    if (category) {
      queryParams.append('category', category);
    }

    if (search) {
      queryParams.append('search', search);
    }

    const requestPromise = this.executeBatchedRequest(
      `${this.API_BASE_URL}/public/depots/${depotId}/products?${queryParams.toString()}`,
      null,
      cacheKey,
      5 * 60 * 1000 // 5 minutes cache for paginated results
    );

    this.pendingRequests.set(cacheKey, requestPromise);
    
    try {
      const result = await requestPromise;
      return result;
    } finally {
      this.pendingRequests.delete(cacheKey);
    }
  }

  /**
   * Prefetch products for better performance
   */
  async prefetchProducts(productIds: number[]): Promise<void> {
    if (productIds.length === 0) {
      return;
    }

    // Don't wait for the result, just trigger the request
    this.batchGetProducts(productIds).catch(console.error);
  }

  /**
   * Prefetch variants for better performance
   */
  async prefetchVariants(depotId: number, productIds: number[]): Promise<void> {
    if (productIds.length === 0) {
      return;
    }

    // Don't wait for the result, just trigger the request
    this.batchGetDepotVariants(depotId, productIds).catch(console.error);
  }

  /**
   * Clear all cached data
   */
  clearCache(): void {
    if (typeof localStorage !== 'undefined') {
      const keys = Object.keys(localStorage);
      const cacheKeys = keys.filter(key => 
        key.startsWith('batch_products_') || 
        key.startsWith('batch_variants_') ||
        key.startsWith('batch_products_variants_') ||
        key.startsWith('depot_products_')
      );
      
      cacheKeys.forEach(key => localStorage.removeItem(key));
    }
  }

  /**
   * Clear specific cache entries
   */
  clearCacheForProducts(productIds: number[]): void {
    if (typeof localStorage !== 'undefined') {
      const keys = Object.keys(localStorage);
      const cacheKeys = keys.filter(key => 
        productIds.some(id => key.includes(`_${id}_`)) || key.includes(`_${id}`)
      );
      
      cacheKeys.forEach(key => localStorage.removeItem(key));
    }
  }

  /**
   * Get cached data if it exists and is not expired
   */
  private getCachedData<T>(cacheKey: string): T | null {
    if (typeof localStorage === 'undefined') {
      return null;
    }

    try {
      const cached = localStorage.getItem(cacheKey);
      if (!cached) {
        return null;
      }

      const { data, timestamp } = JSON.parse(cached);
      const now = Date.now();
      
      // Check if cache is expired (default 30 minutes)
      if (now - timestamp > 30 * 60 * 1000) {
        localStorage.removeItem(cacheKey);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error reading from cache:', error);
      return null;
    }
  }

  /**
   * Set cached data with timestamp
   */
  private setCachedData<T>(cacheKey: string, data: T): void {
    if (typeof localStorage === 'undefined') {
      return;
    }

    try {
      const cacheData = {
        data,
        timestamp: Date.now(),
      };
      
      localStorage.setItem(cacheKey, JSON.stringify(cacheData));
    } catch (error) {
      console.error('Error writing to cache:', error);
    }
  }

  /**
   * Execute a batched request with caching
   */
  private async executeBatchedRequest<T>(
    url: string,
    body: any,
    cacheKey: string,
    cacheTime: number
  ): Promise<T> {
    try {
      const response = await fetch(url, {
        method: body ? 'POST' : 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        body: body ? JSON.stringify(body) : undefined,
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
      }

      const result: ApiResponse<T> = await response.json();
      
      if (!result.success || !result.data) {
        throw new Error('Invalid API response');
      }

      // Cache the result
      this.setCachedData(cacheKey, result.data);
      
      return result.data;
    } catch (error) {
      console.error('Batched API request failed:', error);
      throw error;
    }
  }

  /**
   * Get a single product (fallback for single product requests)
   */
  private async getSingleProduct(productId: number): Promise<Product[]> {
    const cacheKey = `product_${productId}`;
    
    // Check cache first
    const cached = this.getCachedData(cacheKey);
    if (cached) {
      return [cached];
    }

    const response = await fetch(`${this.API_BASE_URL}/public/products/${productId}`);
    
    if (!response.ok) {
      if (response.status === 404) {
        return [];
      }
      throw new Error(`API request failed: ${response.status}`);
    }

    const result: ApiResponse<Product> = await response.json();
    
    if (!result.success || !result.data) {
      return [];
    }

    // Cache the result
    this.setCachedData(cacheKey, result.data);
    
    return [result.data];
  }
}

// Export singleton instance
export const batchedApiService = new BatchedApiService();