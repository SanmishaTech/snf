import { DepotMappingService, Depot, ServiceAvailability, ApiResponse } from '../types';

// Define AreaMaster interface since it's not exported from types
interface AreaMaster {
  id: number;
  name: string;
  pincodes: string;
  deliveryType: string;
  depotId?: number;
  cityId?: number;
  isDairyProduct: boolean;
  depot?: Depot;
}

/**
 * Depot mapping service for converting pincodes to depots using area master API
 * Implements fallback to online depot if geolocation fails
 */
export class DepotMappingServiceImpl implements DepotMappingService {
  private readonly API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';
  private readonly CACHE_TTL = 30 * 60 * 1000; // 30 minutes

  /**
   * Get depot by pincode using area master API
   */
  async getDepotByPincode(pincode: string): Promise<Depot | null> {
    try {
      const response = await fetch(`${this.API_BASE_URL}/public/area-masters/by-pincode/${pincode}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          return null; // No depot found for this pincode
        }
        throw new Error(`API request failed: ${response.status}`);
      }

      const result: ApiResponse<AreaMaster[]> = await response.json();
      
      if (!result.success || !result.data || result.data.length === 0) {
        return null;
      }

      // Return the first depot found for this pincode
      const areaMaster = result.data[0];
      return areaMaster.depot || null;
    } catch (error) {
      console.error('Error fetching depot by pincode:', error);
      throw error;
    }
  }

  /**
   * Get all depots for a given pincode
   */
  async getAllDepotsForPincode(pincode: string): Promise<Depot[]> {
    try {
      const response = await fetch(`${this.API_BASE_URL}/public/area-masters/by-pincode/${pincode}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          return []; // No depots found for this pincode
        }
        throw new Error(`API request failed: ${response.status}`);
      }

      const result: ApiResponse<AreaMaster[]> = await response.json();
      
      if (!result.success || !result.data) {
        return [];
      }

      // Extract all unique depots from area masters
      const depots = result.data
        .filter(areaMaster => areaMaster.depot)
        .map(areaMaster => areaMaster.depot!)
        .filter((depot, index, self) => 
          self.findIndex(d => d.id === depot.id) === index // Remove duplicates
        );

      return depots;
    } catch (error) {
      console.error('Error fetching all depots for pincode:', error);
      throw error;
    }
  }

  /**
   * Validate service availability for a pincode
   */
  async validateServiceAvailability(pincode: string): Promise<ServiceAvailability> {
    try {
      const response = await fetch(`${this.API_BASE_URL}/public/area-masters/by-pincode/${pincode}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          return {
            isAvailable: false,
            supportedProducts: [],
          };
        }
        throw new Error(`API request failed: ${response.status}`);
      }

      const result: ApiResponse<AreaMaster[]> = await response.json();
      
      if (!result.success || !result.data || result.data.length === 0) {
        return {
          isAvailable: false,
        };
      }

      const areaMasters = result.data;
      const depots = areaMasters
        .filter(areaMaster => areaMaster.depot)
        .map(areaMaster => areaMaster.depot!)
        .filter((depot, index, self) =>
          self.findIndex(d => d.id === depot.id) === index
        );

      return {
        isAvailable: depots.length > 0,
        depot: depots.length > 0 ? depots[0] : undefined,
        estimatedDeliveryTime: depots.length > 0 ? 'Same day delivery' : undefined,
        deliveryCharges: depots.length > 0 ? 0 : undefined,
        minimumOrderAmount: depots.length > 0 ? 100 : undefined,
        message: depots.length > 0 ? 'Service available in your area' : 'Service not available in your area',
      };
    } catch (error) {
      console.error('Error validating service availability:', error);
      return {
        isAvailable: false,
        message: 'Error checking service availability',
      };
    }
  }

  /**
   * Get an online depot as fallback when geolocation fails
   */
  async getOnlineDepot(): Promise<Depot | null> {
    try {
      const response = await fetch(`${this.API_BASE_URL}/public/depots/online`);
      
      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
      }

      const result: ApiResponse<Depot[]> = await response.json();
      
      if (!result.success || !result.data || result.data.length === 0) {
        return null;
      }

      // Return the first online depot
      return result.data[0];
    } catch (error) {
      console.error('Error fetching online depot:', error);
      return null;
    }
  }

  /**
   * Get optimal depot for a pincode with fallback to online depot
   */
  async getOptimalDepot(pincode?: string): Promise<Depot | null> {
    // If pincode is provided, try to get depot for that pincode
    if (pincode) {
      try {
        const depot = await this.getDepotByPincode(pincode);
        if (depot) {
          return depot;
        }
      } catch (error) {
        console.warn('Failed to get depot for pincode, falling back to online depot:', error);
      }
    }

    // Fallback to online depot
    try {
      const onlineDepot = await this.getOnlineDepot();
      if (onlineDepot) {
        return onlineDepot;
      }
    } catch (error) {
      console.error('Failed to get online depot:', error);
    }

    return null;
  }

  /**
   * Check if a depot serves a specific pincode
   */
  async doesDepotServePincode(depotId: number, pincode: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.API_BASE_URL}/public/area-masters/by-pincode/${pincode}`);
      
      if (!response.ok) {
        return false;
      }

      const result: ApiResponse<AreaMaster[]> = await response.json();
      
      if (!result.success || !result.data) {
        return false;
      }

      return result.data.some(areaMaster => 
        areaMaster.depotId === depotId
      );
    } catch (error) {
      console.error('Error checking if depot serves pincode:', error);
      return false;
    }
  }

  /**
   * Get all available depots (for debugging and admin purposes)
   */
  async getAllDepots(): Promise<Depot[]> {
    try {
      const response = await fetch(`${this.API_BASE_URL}/public/depots`);
      
      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
      }

      const result: ApiResponse<Depot[]> = await response.json();
      
      if (!result.success || !result.data) {
        return [];
      }

      return result.data;
    } catch (error) {
      console.error('Error fetching all depots:', error);
      return [];
    }
  }

  /**
   * Get depot by ID
   */
  async getDepotById(depotId: number): Promise<Depot | null> {
    try {
      const response = await fetch(`${this.API_BASE_URL}/public/depots/${depotId}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }
        throw new Error(`API request failed: ${response.status}`);
      }

      const result: ApiResponse<Depot> = await response.json();
      
      if (!result.success || !result.data) {
        return null;
      }

      return result.data;
    } catch (error) {
      console.error('Error fetching depot by ID:', error);
      return null;
    }
  }

  /**
   * Get depots by location (latitude and longitude)
   */
  async getDepotsByLocation(latitude: number, longitude: number): Promise<Depot[]> {
    try {
      const response = await fetch(
        `${this.API_BASE_URL}/public/depots/nearby?lat=${latitude}&lng=${longitude}`
      );
      
      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
      }

      const result: ApiResponse<Depot[]> = await response.json();
      
      if (!result.success || !result.data) {
        return [];
      }

      return result.data;
    } catch (error) {
      console.error('Error fetching depots by location:', error);
      return [];
    }
  }

  /**
   * Cache depot mapping results to minimize API calls
   */
  private getCacheKey(pincode: string): string {
    return `depot_mapping_${pincode}`;
  }

  /**
   * Get cached depot mapping if available and not expired
   */
  private getCachedDepot(pincode: string): Depot | null {
    try {
      const cacheKey = this.getCacheKey(pincode);
      const cached = localStorage.getItem(cacheKey);
      
      if (!cached) {
        return null;
      }

      const { depot, timestamp } = JSON.parse(cached);
      
      // Check if cache is expired
      if (Date.now() - timestamp > this.CACHE_TTL) {
        localStorage.removeItem(cacheKey);
        return null;
      }

      return depot;
    } catch (error) {
      console.warn('Error reading cached depot:', error);
      return null;
    }
  }

  /**
   * Cache depot mapping result
   */
  private cacheDepot(pincode: string, depot: Depot): void {
    try {
      const cacheKey = this.getCacheKey(pincode);
      const cacheData = {
        depot,
        timestamp: Date.now(),
      };
      
      localStorage.setItem(cacheKey, JSON.stringify(cacheData));
    } catch (error) {
      console.warn('Error caching depot:', error);
    }
  }

  /**
   * Clear cached depot mapping
   */
  private clearCachedDepot(pincode: string): void {
    try {
      const cacheKey = this.getCacheKey(pincode);
      localStorage.removeItem(cacheKey);
    } catch (error) {
      console.warn('Error clearing cached depot:', error);
    }
  }
}

// Export singleton instance
export const depotMappingService = new DepotMappingServiceImpl();