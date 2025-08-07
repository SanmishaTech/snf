import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { DepotMappingServiceImpl } from '../services/depotMapping';
import { Depot, ServiceAvailability } from '../types';

// Mock fetch API
global.fetch = vi.fn();

describe('DepotMappingService', () => {
  let depotMappingService: DepotMappingServiceImpl;
  
  beforeEach(() => {
    depotMappingService = new DepotMappingServiceImpl();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getDepotByPincode', () => {
    it('should return depot when API returns valid data', async () => {
      const mockDepot: Depot = {
        id: 1,
        name: 'Test Depot',
        address: 'Test Address',
        isOnline: true,
      };

      const mockAreaMaster = {
        id: 1,
        name: 'Test Area',
        pincodes: '123456',
        deliveryType: 'HandDelivery',
        depotId: 1,
        isDairyProduct: false,
        depot: mockDepot,
      };

      const mockResponse = {
        success: true,
        data: [mockAreaMaster],
        timestamp: new Date(),
      };

      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await depotMappingService.getDepotByPincode('123456');
      
      expect(result).toEqual(mockDepot);
      expect(fetch).toHaveBeenCalledWith('/api/public/area-masters/by-pincode/123456');
    });

    it('should return null when API returns 404', async () => {
      (fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 404,
      });

      const result = await depotMappingService.getDepotByPincode('123456');
      
      expect(result).toBeNull();
    });

    it('should throw error when API request fails', async () => {
      (fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      await expect(depotMappingService.getDepotByPincode('123456')).rejects.toThrow('API request failed: 500');
    });

    it('should return null when API returns success but no data', async () => {
      const mockResponse = {
        success: true,
        data: [],
        timestamp: new Date(),
      };

      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await depotMappingService.getDepotByPincode('123456');
      
      expect(result).toBeNull();
    });
  });

  describe('getAllDepotsForPincode', () => {
    it('should return all unique depots for pincode', async () => {
      const mockDepot1: Depot = {
        id: 1,
        name: 'Depot 1',
        address: 'Address 1',
        isOnline: true,
      };

      const mockDepot2: Depot = {
        id: 2,
        name: 'Depot 2',
        address: 'Address 2',
        isOnline: true,
      };

      const mockAreaMasters = [
        {
          id: 1,
          name: 'Area 1',
          pincodes: '123456',
          deliveryType: 'HandDelivery',
          depotId: 1,
          isDairyProduct: false,
          depot: mockDepot1,
        },
        {
          id: 2,
          name: 'Area 2',
          pincodes: '123456',
          deliveryType: 'Courier',
          depotId: 2,
          isDairyProduct: true,
          depot: mockDepot2,
        },
      ];

      const mockResponse = {
        success: true,
        data: mockAreaMasters,
        timestamp: new Date(),
      };

      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await depotMappingService.getAllDepotsForPincode('123456');
      
      expect(result).toEqual([mockDepot1, mockDepot2]);
    });

    it('should return empty array when no depots found', async () => {
      const mockResponse = {
        success: true,
        data: [],
        timestamp: new Date(),
      };

      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await depotMappingService.getAllDepotsForPincode('123456');
      
      expect(result).toEqual([]);
    });
  });

  describe('validateServiceAvailability', () => {
    it('should return service availability with depot when available', async () => {
      const mockDepot: Depot = {
        id: 1,
        name: 'Test Depot',
        address: 'Test Address',
        isOnline: true,
      };

      const mockAreaMaster = {
        id: 1,
        name: 'Test Area',
        pincodes: '123456',
        deliveryType: 'HandDelivery',
        depotId: 1,
        isDairyProduct: false,
        depot: mockDepot,
      };

      const mockResponse = {
        success: true,
        data: [mockAreaMaster],
        timestamp: new Date(),
      };

      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result: ServiceAvailability = await depotMappingService.validateServiceAvailability('123456');
      
      expect(result.isAvailable).toBe(true);
      expect(result.depot).toEqual(mockDepot);
      expect(result.estimatedDeliveryTime).toBe('Same day delivery');
      expect(result.deliveryCharges).toBe(0);
      expect(result.minimumOrderAmount).toBe(100);
      expect(result.message).toBe('Service available in your area');
    });

    it('should return service unavailable when no depots found', async () => {
      const mockResponse = {
        success: true,
        data: [],
        timestamp: new Date(),
      };

      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result: ServiceAvailability = await depotMappingService.validateServiceAvailability('123456');
      
      expect(result.isAvailable).toBe(false);
      expect(result.depot).toBeUndefined();
      expect(result.message).toBe('Service not available in your area');
    });
  });

  describe('getOnlineDepot', () => {
    it('should return online depot when available', async () => {
      const mockDepot: Depot = {
        id: 1,
        name: 'Online Depot',
        address: 'Online Address',
        isOnline: true,
      };

      const mockResponse = {
        success: true,
        data: [mockDepot],
        timestamp: new Date(),
      };

      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await depotMappingService.getOnlineDepot();
      
      expect(result).toEqual(mockDepot);
    });

    it('should return null when no online depots available', async () => {
      const mockResponse = {
        success: true,
        data: [],
        timestamp: new Date(),
      };

      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await depotMappingService.getOnlineDepot();
      
      expect(result).toBeNull();
    });
  });

  describe('getOptimalDepot', () => {
    it('should return depot for pincode when available', async () => {
      const mockDepot: Depot = {
        id: 1,
        name: 'Pincode Depot',
        address: 'Pincode Address',
        isOnline: true,
      };

      vi.spyOn(depotMappingService, 'getDepotByPincode').mockResolvedValueOnce(mockDepot);

      const result = await depotMappingService.getOptimalDepot('123456');
      
      expect(result).toEqual(mockDepot);
    });

    it('should fallback to online depot when pincode depot not available', async () => {
      const mockOnlineDepot: Depot = {
        id: 2,
        name: 'Online Depot',
        address: 'Online Address',
        isOnline: true,
      };

      vi.spyOn(depotMappingService, 'getDepotByPincode').mockResolvedValueOnce(null);
      vi.spyOn(depotMappingService, 'getOnlineDepot').mockResolvedValueOnce(mockOnlineDepot);

      const result = await depotMappingService.getOptimalDepot('123456');
      
      expect(result).toEqual(mockOnlineDepot);
    });

    it('should return null when no depot available', async () => {
      vi.spyOn(depotMappingService, 'getDepotByPincode').mockResolvedValueOnce(null);
      vi.spyOn(depotMappingService, 'getOnlineDepot').mockResolvedValueOnce(null);

      const result = await depotMappingService.getOptimalDepot('123456');
      
      expect(result).toBeNull();
    });
  });

  describe('getDepotsByLocation', () => {
    it('should return depots near given location', async () => {
      const mockDepot: Depot = {
        id: 1,
        name: 'Nearby Depot',
        address: 'Nearby Address',
        isOnline: true,
      };

      const mockResponse = {
        success: true,
        data: [mockDepot],
        timestamp: new Date(),
      };

      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await depotMappingService.getDepotsByLocation(12.9716, 77.5946);
      
      expect(result).toEqual([mockDepot]);
      expect(fetch).toHaveBeenCalledWith('/api/public/depots/nearby?lat=12.9716&lng=77.5946');
    });
  });

  describe('caching', () => {
    beforeEach(() => {
      // Mock localStorage
      const localStorageMock = {
        getItem: vi.fn(),
        setItem: vi.fn(),
        removeItem: vi.fn(),
      };
      global.localStorage = localStorageMock as any;
    });

    it('should cache depot mapping result', async () => {
      const mockDepot: Depot = {
        id: 1,
        name: 'Test Depot',
        address: 'Test Address',
        isOnline: true,
      };

      const mockAreaMaster = {
        id: 1,
        name: 'Test Area',
        pincodes: '123456',
        deliveryType: 'HandDelivery',
        depotId: 1,
        isDairyProduct: false,
        depot: mockDepot,
      };

      const mockResponse = {
        success: true,
        data: [mockAreaMaster],
        timestamp: new Date(),
      };

      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      await depotMappingService.getDepotByPincode('123456');
      
      expect(localStorage.setItem).toHaveBeenCalledWith(
        'depot_mapping_123456',
        expect.stringContaining('"depot"')
      );
    });

    it('should retrieve cached depot when available', async () => {
      const mockDepot: Depot = {
        id: 1,
        name: 'Cached Depot',
        address: 'Cached Address',
        isOnline: true,
      };

      const cachedData = {
        depot: mockDepot,
        timestamp: Date.now(),
      };

      (localStorage.getItem as any).mockReturnValueOnce(JSON.stringify(cachedData));

      // Access private method for testing
      const result = (depotMappingService as any).getCachedDepot('123456');
      
      expect(result).toEqual(mockDepot);
    });

    it('should not return expired cached depot', async () => {
      const mockDepot: Depot = {
        id: 1,
        name: 'Expired Depot',
        address: 'Expired Address',
        isOnline: true,
      };

      const cachedData = {
        depot: mockDepot,
        timestamp: Date.now() - 31 * 60 * 1000, // 31 minutes ago (expired)
      };

      (localStorage.getItem as any).mockReturnValueOnce(JSON.stringify(cachedData));

      // Access private method for testing
      const result = (depotMappingService as any).getCachedDepot('123456');
      
      expect(result).toBeNull();
      expect(localStorage.removeItem).toHaveBeenCalledWith('depot_mapping_123456');
    });
  });
});