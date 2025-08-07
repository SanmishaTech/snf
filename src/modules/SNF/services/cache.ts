import { CacheManager, CacheEntry, CacheConfig } from '../types';

/**
 * Cache management service for products and variants
 * Implements caching strategy: 30 minutes for products, 15 minutes for depot variants with background refresh
 */
export class CacheManagerImpl implements CacheManager {
  private readonly DEFAULT_CONFIG: CacheConfig = {
    products: { ttl: 30 * 60 * 1000, maxSize: 100 }, // 30 minutes
    variants: { ttl: 15 * 60 * 1000, maxSize: 200 }, // 15 minutes
    depotMapping: { ttl: 60 * 60 * 1000, maxSize: 50 }, // 1 hour
  };

  private memoryCache: Map<string, CacheEntry<any>> = new Map();
  private config: CacheConfig;

  constructor(config?: Partial<CacheConfig>) {
    this.config = { ...this.DEFAULT_CONFIG, ...config };
  }

  /**
   * Get cached data by key
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      // Check memory cache first
      const memoryEntry = this.memoryCache.get(key);
      if (memoryEntry) {
        if (this.isEntryValid(memoryEntry)) {
          return memoryEntry.data as T;
        } else {
          // Remove expired entry
          this.memoryCache.delete(key);
        }
      }

      // Check localStorage as fallback
      const localEntry = this.getLocalStorageEntry(key);
      if (localEntry) {
        if (this.isEntryValid(localEntry)) {
          // Restore to memory cache
          this.memoryCache.set(key, localEntry);
          return localEntry.data as T;
        } else {
          // Remove expired entry
          this.removeLocalStorageEntry(key);
        }
      }

      return null;
    } catch (error) {
      console.warn('Error getting from cache:', error);
      return null;
    }
  }

  /**
   * Set cached data with TTL
   */
  async set<T>(key: string, data: T, ttl?: number): Promise<void> {
    try {
      const entry: CacheEntry<T> = {
        data,
        timestamp: Date.now(),
        ttl: ttl || this.getTTLForKey(key),
      };

      // Set in memory cache
      this.memoryCache.set(key, entry);

      // Enforce max size
      this.enforceMaxSize();

      // Set in localStorage for persistence
      this.setLocalStorageEntry(key, entry);

      // Schedule background refresh if needed
      this.scheduleBackgroundRefresh(key, entry);
    } catch (error) {
      console.warn('Error setting cache:', error);
    }
  }

  /**
   * Invalidate cache entries matching pattern
   */
  async invalidate(pattern: string): Promise<void> {
    try {
      const regex = new RegExp(pattern);
      
      // Clear from memory cache
      for (const key of this.memoryCache.keys()) {
        if (regex.test(key)) {
          this.memoryCache.delete(key);
        }
      }

      // Clear from localStorage
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('cache_') && regex.test(key.replace('cache_', ''))) {
          localStorage.removeItem(key);
        }
      }
    } catch (error) {
      console.warn('Error invalidating cache:', error);
    }
  }

  /**
   * Clear all cache entries
   */
  async clear(): Promise<void> {
    try {
      // Clear memory cache
      this.memoryCache.clear();

      // Clear localStorage cache entries
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('cache_')) {
          localStorage.removeItem(key);
        }
      }
    } catch (error) {
      console.warn('Error clearing cache:', error);
    }
  }

  /**
   * Check if key exists in cache
   */
  async has(key: string): Promise<boolean> {
    try {
      // Check memory cache
      if (this.memoryCache.has(key)) {
        const entry = this.memoryCache.get(key)!;
        if (this.isEntryValid(entry)) {
          return true;
        } else {
          this.memoryCache.delete(key);
        }
      }

      // Check localStorage
      const localEntry = this.getLocalStorageEntry(key);
      if (localEntry) {
        if (this.isEntryValid(localEntry)) {
          return true;
        } else {
          this.removeLocalStorageEntry(key);
        }
      }

      return false;
    } catch (error) {
      console.warn('Error checking cache existence:', error);
      return false;
    }
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<{
    memorySize: number;
    localStorageSize: number;
    hitRate: number;
    entries: Array<{ key: string; size: number; ttl: number }>;
  }> {
    try {
      const memoryEntries = Array.from(this.memoryCache.entries()).map(([key, entry]) => ({
        key,
        size: JSON.stringify(entry).length,
        ttl: entry.ttl,
      }));

      const localStorageEntries: Array<{ key: string; size: number; ttl: number }> = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('cache_')) {
          try {
            const entry = JSON.parse(localStorage.getItem(key)!);
            localStorageEntries.push({
              key: key.replace('cache_', ''),
              size: JSON.stringify(entry).length,
              ttl: entry.ttl,
            });
          } catch (e) {
            // Ignore invalid entries
          }
        }
      }

      return {
        memorySize: this.memoryCache.size,
        localStorageSize: localStorageEntries.length,
        hitRate: 0, // Could be implemented with hit tracking
        entries: [...memoryEntries, ...localStorageEntries],
      };
    } catch (error) {
      console.warn('Error getting cache stats:', error);
      return {
        memorySize: 0,
        localStorageSize: 0,
        hitRate: 0,
        entries: [],
      };
    }
  }

  /**
   * Prefetch data for better performance
   */
  async prefetch<T>(key: string, fetchFn: () => Promise<T>, ttl?: number): Promise<void> {
    try {
      // Check if already cached
      if (await this.has(key)) {
        return;
      }

      // Fetch and cache data
      const data = await fetchFn();
      await this.set(key, data, ttl);
    } catch (error) {
      console.warn('Error prefetching data:', error);
    }
  }

  /**
   * Get or set pattern - fetch if not cached
   */
  async getOrSet<T>(key: string, fetchFn: () => Promise<T>, ttl?: number): Promise<T> {
    try {
      // Try to get from cache first
      const cached = await this.get<T>(key);
      if (cached !== null) {
        return cached;
      }

      // Fetch and cache data
      const data = await fetchFn();
      await this.set(key, data, ttl);
      return data;
    } catch (error) {
      console.warn('Error in getOrSet pattern:', error);
      throw error;
    }
  }

  /**
   * Check if cache entry is still valid
   */
  private isEntryValid<T>(entry: CacheEntry<T>): boolean {
    return Date.now() - entry.timestamp < entry.ttl;
  }

  /**
   * Get TTL for a specific key based on configuration
   */
  private getTTLForKey(key: string): number {
    if (key.startsWith('products_')) {
      return this.config.products.ttl;
    } else if (key.startsWith('variants_')) {
      return this.config.variants.ttl;
    } else if (key.startsWith('depot_mapping_')) {
      return this.config.depotMapping.ttl;
    }
    return this.config.products.ttl; // Default to products TTL
  }

  /**
   * Get max size for a specific key based on configuration
   */
  private getMaxSizeForKey(key: string): number {
    if (key.startsWith('products_')) {
      return this.config.products.maxSize;
    } else if (key.startsWith('variants_')) {
      return this.config.variants.maxSize;
    } else if (key.startsWith('depot_mapping_')) {
      return this.config.depotMapping.maxSize;
    }
    return this.config.products.maxSize; // Default to products max size
  }

  /**
   * Enforce maximum cache size
   */
  private enforceMaxSize(): void {
    if (this.memoryCache.size <= 100) { // Allow some buffer
      return;
    }

    // Remove oldest entries
    const entries = Array.from(this.memoryCache.entries())
      .sort((a, b) => a[1].timestamp - b[1].timestamp);

    const toRemove = entries.slice(0, Math.floor(this.memoryCache.size * 0.2)); // Remove 20%
    toRemove.forEach(([key]) => {
      this.memoryCache.delete(key);
    });
  }

  /**
   * Get localStorage entry
   */
  private getLocalStorageEntry<T>(key: string): CacheEntry<T> | null {
    try {
      const item = localStorage.getItem(`cache_${key}`);
      if (!item) {
        return null;
      }
      return JSON.parse(item);
    } catch (error) {
      console.warn('Error reading from localStorage:', error);
      return null;
    }
  }

  /**
   * Set localStorage entry
   */
  private setLocalStorageEntry<T>(key: string, entry: CacheEntry<T>): void {
    try {
      localStorage.setItem(`cache_${key}`, JSON.stringify(entry));
    } catch (error) {
      // Handle localStorage quota exceeded
      if (error instanceof Error && error.name === 'QuotaExceededError') {
        console.warn('LocalStorage quota exceeded, clearing some entries');
        this.clearOldestLocalStorageEntries();
        try {
          localStorage.setItem(`cache_${key}`, JSON.stringify(entry));
        } catch (e) {
          console.warn('Still unable to store in localStorage after cleanup:', e);
        }
      } else {
        console.warn('Error writing to localStorage:', error);
      }
    }
  }

  /**
   * Remove localStorage entry
   */
  private removeLocalStorageEntry(key: string): void {
    try {
      localStorage.removeItem(`cache_${key}`);
    } catch (error) {
      console.warn('Error removing from localStorage:', error);
    }
  }

  /**
   * Clear oldest localStorage entries when quota is exceeded
   */
  private clearOldestLocalStorageEntries(): void {
    try {
      const entries: Array<{ key: string; timestamp: number }> = [];

      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('cache_')) {
          try {
            const entry = JSON.parse(localStorage.getItem(key)!);
            entries.push({
              key: key.replace('cache_', ''),
              timestamp: entry.timestamp,
            });
          } catch (e) {
            // Remove invalid entries
            localStorage.removeItem(key);
          }
        }
      }

      // Sort by timestamp and remove oldest 50%
      entries.sort((a, b) => a.timestamp - b.timestamp);
      const toRemove = entries.slice(0, Math.floor(entries.length * 0.5));
      toRemove.forEach(({ key }) => {
        localStorage.removeItem(`cache_${key}`);
      });
    } catch (error) {
      console.warn('Error clearing oldest localStorage entries:', error);
    }
  }

  /**
   * Schedule background refresh for cache entries
   */
  private scheduleBackgroundRefresh<T>(key: string, entry: CacheEntry<T>): void {
    const refreshTime = entry.ttl * 0.8; // Refresh at 80% of TTL
    const delay = refreshTime - (Date.now() - entry.timestamp);

    if (delay > 0) {
      setTimeout(() => {
        this.backgroundRefresh(key);
      }, delay);
    }
  }

  /**
   * Background refresh of cache entry
   */
  private async backgroundRefresh(key: string): Promise<void> {
    try {
      // This is a placeholder for background refresh logic
      // In a real implementation, this would trigger a silent API call
      // to refresh the data without blocking the UI
      console.log(`Background refresh triggered for key: ${key}`);
      
      // The actual refresh logic would be implemented by the calling code
      // This could use a message queue or event system to trigger refresh
    } catch (error) {
      console.warn('Error during background refresh:', error);
    }
  }
}

// Export singleton instance
export const cacheManager = new CacheManagerImpl();

// Convenience functions for common cache operations
export const cache = {
  get: <T>(key: string) => cacheManager.get<T>(key),
  set: <T>(key: string, data: T, ttl?: number) => cacheManager.set(key, data, ttl),
  invalidate: (pattern: string) => cacheManager.invalidate(pattern),
  clear: () => cacheManager.clear(),
  has: (key: string) => cacheManager.has(key),
  prefetch: <T>(key: string, fetchFn: () => Promise<T>, ttl?: number) => 
    cacheManager.prefetch(key, fetchFn, ttl),
  getOrSet: <T>(key: string, fetchFn: () => Promise<T>, ttl?: number) => 
    cacheManager.getOrSet(key, fetchFn, ttl),
  getStats: () => cacheManager.getStats(),
};