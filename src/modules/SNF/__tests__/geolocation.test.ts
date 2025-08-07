import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { GeolocationServiceImpl } from '../services/geolocation';
import { LocationData, GeolocationError, GeolocationErrorType } from '../types';

// Mock navigator.geolocation
const mockGeolocation = {
  getCurrentPosition: vi.fn(),
  watchPosition: vi.fn(),
  clearWatch: vi.fn(),
};

Object.defineProperty(global.navigator, 'geolocation', {
  value: mockGeolocation,
  writable: true,
});

// Mock Permissions API
const mockPermissions = {
  query: vi.fn(),
};

Object.defineProperty(global.navigator, 'permissions', {
  value: mockPermissions,
  writable: true,
});

describe('GeolocationService', () => {
  let geolocationService: GeolocationServiceImpl;
  
  beforeEach(() => {
    geolocationService = new GeolocationServiceImpl();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('isGeolocationSupported', () => {
    it('should return true when geolocation is supported', () => {
      expect(geolocationService.isGeolocationSupported()).toBe(true);
    });

    it('should return false when geolocation is not supported', () => {
      Object.defineProperty(global.navigator, 'geolocation', {
        value: undefined,
        writable: true,
      });

      expect(geolocationService.isGeolocationSupported()).toBe(false);
    });
  });

  describe('checkPermissionStatus', () => {
    it('should return granted permission status', async () => {
      const mockPermissionStatus = {
        state: 'granted' as PermissionState,
      };

      mockPermissions.query.mockResolvedValueOnce(mockPermissionStatus);

      const result = await geolocationService.checkPermissionStatus();
      
      expect(result).toBe('granted');
      expect(mockPermissions.query).toHaveBeenCalledWith({ name: 'geolocation' });
    });

    it('should return denied permission status', async () => {
      const mockPermissionStatus = {
        state: 'denied' as PermissionState,
      };

      mockPermissions.query.mockResolvedValueOnce(mockPermissionStatus);

      const result = await geolocationService.checkPermissionStatus();
      
      expect(result).toBe('denied');
    });

    it('should return prompt permission status', async () => {
      const mockPermissionStatus = {
        state: 'prompt' as PermissionState,
      };

      mockPermissions.query.mockResolvedValueOnce(mockPermissionStatus);

      const result = await geolocationService.checkPermissionStatus();
      
      expect(result).toBe('prompt');
    });

    it('should handle permission API not available', async () => {
      Object.defineProperty(global.navigator, 'permissions', {
        value: undefined,
        writable: true,
      });

      const result = await geolocationService.checkPermissionStatus();
      
      expect(result).toBe('prompt');
    });
  });

  describe('requestPermission', () => {
    it('should return granted after successful permission request', async () => {
      // Mock permission check
      mockPermissions.query.mockResolvedValueOnce({ state: 'prompt' as PermissionState });
      
      // Mock successful geolocation request
      mockGeolocation.getCurrentPosition.mockImplementationOnce(
        (success) => success({
          coords: {
            latitude: 12.9716,
            longitude: 77.5946,
            accuracy: 10,
          },
          timestamp: Date.now(),
        })
      );

      const result = await geolocationService.requestPermission();
      
      expect(result).toBe('granted');
    });

    it('should return denied when permission is denied', async () => {
      // Mock permission check
      mockPermissions.query.mockResolvedValueOnce({ state: 'denied' as PermissionState });

      const result = await geolocationService.requestPermission();
      
      expect(result).toBe('denied');
    });
  });

  describe('requestLocationWithExplanation', () => {
    it('should return location data on successful geolocation', async () => {
      const mockPosition = {
        coords: {
          latitude: 12.9716,
          longitude: 77.5946,
          accuracy: 10,
        },
        timestamp: Date.now(),
      };

      mockGeolocation.getCurrentPosition.mockImplementationOnce(
        (success) => success(mockPosition)
      );

      const result = await geolocationService.requestLocationWithExplanation();
      
      expect(result).toEqual({
        latitude: 12.9716,
        longitude: 77.5946,
        pincode: '560001', // Mocked pincode from reverse geocoding
        accuracy: 10,
      });
    });

    it('should handle permission denied error', async () => {
      const mockError = {
        code: 1, // PERMISSION_DENIED
        message: 'User denied the request for Geolocation.',
      };

      mockGeolocation.getCurrentPosition.mockImplementationOnce(
        (success, error) => error(mockError)
      );

      await expect(geolocationService.requestLocationWithExplanation()).rejects.toEqual({
        type: 'PERMISSION_DENIED',
        message: 'User denied the request for Geolocation.',
        code: 1,
        recoverable: false,
      });
    });

    it('should handle position unavailable error', async () => {
      const mockError = {
        code: 2, // POSITION_UNAVAILABLE
        message: 'Position information is unavailable.',
      };

      mockGeolocation.getCurrentPosition.mockImplementationOnce(
        (success, error) => error(mockError)
      );

      await expect(geolocationService.requestLocationWithExplanation()).rejects.toEqual({
        type: 'POSITION_UNAVAILABLE',
        message: 'Position information is unavailable.',
        code: 2,
        recoverable: true,
      });
    });

    it('should handle timeout error', async () => {
      const mockError = {
        code: 3, // TIMEOUT
        message: 'The request to get user location timed out.',
      };

      mockGeolocation.getCurrentPosition.mockImplementationOnce(
        (success, error) => error(mockError)
      );

      await expect(geolocationService.requestLocationWithExplanation()).rejects.toEqual({
        type: 'TIMEOUT',
        message: 'The request to get user location timed out.',
        code: 3,
        recoverable: true,
      });
    });
  });

  describe('getPositionFromPincode', () => {
    it('should return location data for valid pincode', async () => {
      const mockResponse = {
        success: true,
        data: {
          latitude: 12.9716,
          longitude: 77.5946,
          city: 'Bangalore',
          state: 'Karnataka',
          country: 'India',
        },
        timestamp: new Date(),
      };

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await geolocationService.getPositionFromPincode('560001');
      
      expect(result).toEqual({
        latitude: 12.9716,
        longitude: 77.5946,
        pincode: '560001',
        city: 'Bangalore',
        state: 'Karnataka',
        country: 'India',
      });
    });

    it('should handle invalid pincode', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: false,
        status: 404,
      });

      await expect(geolocationService.getPositionFromPincode('000000')).rejects.toEqual({
        type: 'INVALID_PINCODE',
        message: 'Invalid pincode provided',
        code: 'INVALID_PINCODE',
        recoverable: true,
      });
    });
  });

  describe('watchPosition', () => {
    it('should set up position watching and return cleanup function', () => {
      const mockCallback = vi.fn();
      const mockWatchId = 12345;

      mockGeolocation.watchPosition.mockReturnValueOnce(mockWatchId);

      const cleanup = geolocationService.watchPosition(mockCallback);
      
      expect(mockGeolocation.watchPosition).toHaveBeenCalled();
      expect(typeof cleanup).toBe('function');
      
      // Test cleanup function
      cleanup();
      expect(mockGeolocation.clearWatch).toHaveBeenCalledWith(mockWatchId);
    });

    it('should call error callback when geolocation error occurs', () => {
      const mockCallback = vi.fn();
      const mockErrorCallback = vi.fn();
      const mockError = {
        code: 1,
        message: 'Permission denied',
      };

      mockGeolocation.watchPosition.mockImplementationOnce(
        (success, error) => {
          if (error) error(mockError);
          return 12345;
        }
      );

      geolocationService.watchPosition(mockCallback, mockErrorCallback);
      
      expect(mockErrorCallback).toHaveBeenCalledWith({
        type: 'PERMISSION_DENIED',
        message: 'Permission denied',
        code: 1,
        recoverable: false,
      });
    });
  });

  describe('calculateDistance', () => {
    it('should calculate distance between two points correctly', () => {
      // Distance between Bangalore and Chennai (approximately 350 km)
      const distance = geolocationService.calculateDistance(
        12.9716, 77.5946, // Bangalore
        13.0827, 80.2707  // Chennai
      );
      
      expect(distance).toBeGreaterThan(300); // Should be around 350 km
      expect(distance).toBeLessThan(400);
    });

    it('should return 0 for same coordinates', () => {
      const distance = geolocationService.calculateDistance(
        12.9716, 77.5946, // Bangalore
        12.9716, 77.5946  // Same point
      );
      
      expect(distance).toBe(0);
    });

    it('should calculate short distances accurately', () => {
      // Distance between two close points in Bangalore (approximately 5 km)
      const distance = geolocationService.calculateDistance(
        12.9716, 77.5946, // Bangalore center
        12.9279, 77.6271  // Bangalore Cantonment
      );
      
      expect(distance).toBeGreaterThan(4); // Should be around 5 km
      expect(distance).toBeLessThan(6);
    });
  });
});