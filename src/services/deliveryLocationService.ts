import { getAreaMastersByPincode } from '@/services/areaMasterService';

export interface DeliveryLocation {
  pincode: string;
  depotId?: string;
  depotName?: string;
  areaId?: number;
  areaName?: string;
}

/**
 * Service to manage delivery location selection and depot mapping
 */
export class DeliveryLocationService {
  private static readonly STORAGE_KEY = 'snf.deliveryLocation';
  
  /**
   * Get the current delivery location from localStorage
   */
  static getCurrentLocation(): DeliveryLocation | null {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (!stored) return null;
      
      return JSON.parse(stored);
    } catch (error) {
      console.warn('Failed to parse delivery location from storage:', error);
      return null;
    }
  }

  /**
   * Set the delivery location in localStorage
   */
  static setCurrentLocation(location: DeliveryLocation): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(location));
    } catch (error) {
      console.warn('Failed to store delivery location:', error);
    }
  }

  /**
   * Clear the current delivery location
   */
  static clearCurrentLocation(): void {
    localStorage.removeItem(this.STORAGE_KEY);
  }

  /**
   * Get depot details for a pincode using area master API
   */
  static async getDepotForPincode(pincode: string): Promise<DeliveryLocation | null> {
    try {
      const areaMasters = await getAreaMastersByPincode(pincode);
      
      if (areaMasters.length === 0) {
        return null;
      }

      // Use the first area master that has a depot
      const areaWithDepot = areaMasters.find(area => area.depot);
      
      if (!areaWithDepot || !areaWithDepot.depot) {
        return null;
      }

      const location: DeliveryLocation = {
        pincode,
        depotId: areaWithDepot.depot.id.toString(),
        depotName: areaWithDepot.depot.name,
        areaId: areaWithDepot.id,
        areaName: areaWithDepot.name,
      };

      // Store the location for future use
      this.setCurrentLocation(location);
      
      return location;
    } catch (error) {
      console.error('Failed to get depot for pincode:', error);
      return null;
    }
  }

  /**
   * Update the delivery location by pincode
   * This will fetch depot details and store them
   */
  static async updateLocationByPincode(pincode: string): Promise<DeliveryLocation | null> {
    // Clear existing location
    this.clearCurrentLocation();
    
    // Validate pincode format
    if (!pincode || !/^\d{6}$/.test(pincode)) {
      return null;
    }

    return await this.getDepotForPincode(pincode);
  }

  /**
   * Get the current depot ID for order placement
   */
  static getCurrentDepotId(): string | null {
    const location = this.getCurrentLocation();
    return location?.depotId || null;
  }

  /**
   * Check if a delivery location is set
   */
  static hasDeliveryLocation(): boolean {
    const location = this.getCurrentLocation();
    return !!(location && location.pincode && location.depotId);
  }

  /**
   * Migrate old pincode storage to new delivery location format
   */
  static async migrateFromOldPincodeStorage(): Promise<void> {
    // Check if we already have the new format
    if (this.hasDeliveryLocation()) {
      return;
    }

    // Check for old pincode format
    const oldPincode = localStorage.getItem('snf.pincode');
    if (oldPincode && /^\d{6}$/.test(oldPincode)) {
      await this.updateLocationByPincode(oldPincode);
      // Remove old storage
      localStorage.removeItem('snf.pincode');
    }
  }
}

export default DeliveryLocationService;
