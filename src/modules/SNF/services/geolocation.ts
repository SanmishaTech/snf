import { GeolocationService, LocationData, GeolocationError, GeolocationOptions } from '../types';

// Extended error types for internal use
type ExtendedGeolocationErrorType = 'PERMISSION_DENIED' | 'POSITION_UNAVAILABLE' | 'TIMEOUT' | 'INVALID_PINCODE' | 'NOT_SUPPORTED' | 'UNKNOWN_ERROR';

interface ExtendedGeolocationError extends Omit<GeolocationError, 'type'> {
  type: ExtendedGeolocationErrorType;
}

/**
 * Geolocation service for detecting user location and converting to pincode
 * Implements Chrome's geolocation API with comprehensive error handling
 */
export class GeolocationServiceImpl implements GeolocationService {
  private readonly DEFAULT_OPTIONS: GeolocationOptions = {
    enableHighAccuracy: true,
    timeout: 10000,
    maximumAge: 300000, // 5 minutes
  };

  private readonly GEOCODING_API_URL = 'https://api.opencagedata.com/geocode/v1/json';
  private readonly GEOCODING_API_KEY = import.meta.env.VITE_GEOCODING_API_KEY || '';

  /**
   * Check if geolocation is supported in the current browser
   */
  isGeolocationSupported(): boolean {
    return 'geolocation' in navigator && typeof navigator.geolocation === 'object';
  }

  /**
   * Check the current permission status for geolocation
   */
  async checkPermissionStatus(): Promise<PermissionState> {
    if (!this.isGeolocationSupported()) {
      return 'denied';
    }

    try {
      // Check if Permissions API is available
      if ('permissions' in navigator) {
        const permission = await navigator.permissions.query({ name: 'geolocation' });
        return permission.state;
      }
      
      // Fallback: try to get current position to check permission
      return await this.checkPermissionByPosition();
    } catch (error) {
      console.warn('Error checking geolocation permission:', error);
      return 'prompt';
    }
  }

  /**
   * Request geolocation permission with user explanation
   */
  async requestPermission(): Promise<PermissionState> {
    if (!this.isGeolocationSupported()) {
      throw {
        type: 'PERMISSION_DENIED',
        message: 'Geolocation is not supported in your browser',
        code: 'GEOLOCATION_NOT_SUPPORTED',
      } as GeolocationError;
    }

    try {
      // Check if Permissions API is available
      if ('permissions' in navigator) {
        const permission = await navigator.permissions.query({ name: 'geolocation' });
        return permission.state;
      }
      
      // Fallback: try to get current position
      await this.getCurrentPosition();
      return 'granted';
    } catch (error) {
      const geolocationError = error as GeolocationError;
      if (geolocationError.code === 1) {
        return 'denied';
      }
      return 'prompt';
    }
  }

  /**
   * Request location with user explanation and comprehensive error handling
   */
  async requestLocationWithExplanation(options?: GeolocationOptions): Promise<LocationData> {
    if (!this.isGeolocationSupported()) {
      throw {
        type: 'PERMISSION_DENIED',
        message: 'Geolocation is not supported in your browser. Please enter your pincode manually.',
        code: 1,
        recoverable: true,
      } as GeolocationError;
    }

    try {
      const position = await this.getCurrentPosition(options);
      return await this.reverseGeocode(position.coords.latitude, position.coords.longitude);
    } catch (error) {
      const geolocationError = error as GeolocationError;
      
      // Enhance error messages with user-friendly explanations
      switch (geolocationError.code) {
        case 1: // PERMISSION_DENIED
          throw {
            type: 'PERMISSION_DENIED',
            message: 'Location access was denied. Please enable location access or enter your pincode manually.',
            code: 'PERMISSION_DENIED',
            details: geolocationError,
          } as GeolocationError;
        
        case 2: // POSITION_UNAVAILABLE
          throw {
            type: 'POSITION_UNAVAILABLE',
            message: 'Unable to retrieve your location. Please check your device settings or enter your pincode manually.',
            code: 'POSITION_UNAVAILABLE',
            details: geolocationError,
          } as GeolocationError;
        
        case 3: // TIMEOUT
          throw {
            type: 'TIMEOUT',
            message: 'Location request timed out. Please try again or enter your pincode manually.',
            code: 'TIMEOUT',
            details: geolocationError,
          } as GeolocationError;
        
        default:
          throw {
            type: 'TIMEOUT',
            message: 'An unknown error occurred while getting your location. Please try again or enter your pincode manually.',
            code: 3,
            recoverable: true,
            details: geolocationError,
          } as GeolocationError;
      }
    }
  }

  /**
   * Get current position with promise wrapper
   */
  private getCurrentPosition(options?: GeolocationOptions): Promise<GeolocationPosition> {
    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        resolve,
        (error) => reject(error),
        { ...this.DEFAULT_OPTIONS, ...options }
      );
    });
  }

  /**
   * Check permission by attempting to get position
   */
  private async checkPermissionByPosition(): Promise<PermissionState> {
    try {
      await this.getCurrentPosition({ timeout: 2000 });
      return 'granted';
    } catch (error) {
      const geolocationError = error as GeolocationError;
      if (geolocationError.code === 1) {
        return 'denied';
      }
      return 'prompt';
    }
  }

  /**
   * Reverse geocode coordinates to get location data including pincode
   */
  private async reverseGeocode(latitude: number, longitude: number): Promise<LocationData> {
    try {
      if (!this.GEOCODING_API_KEY) {
        // Fallback to basic location data if no API key
        return {
          latitude,
          longitude,
          pincode: this.generateMockPincode(latitude, longitude),
          city: 'Unknown',
          state: 'Unknown',
          country: 'India',
          address: 'Unknown Address',
        };
      }

      const url = new URL(this.GEOCODING_API_URL);
      url.searchParams.append('q', `${latitude}+${longitude}`);
      url.searchParams.append('key', this.GEOCODING_API_KEY);
      url.searchParams.append('limit', '1');

      const response = await fetch(url.toString());
      
      if (!response.ok) {
        throw new Error(`Geocoding API request failed: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.results.length === 0) {
        throw new Error('No results found for the given coordinates');
      }

      const result = data.results[0];
      const components = result.components;

      return {
        latitude,
        longitude,
        pincode: components.postcode || this.generateMockPincode(latitude, longitude),
        city: components.city || components.town || components.village || 'Unknown',
        state: components.state || 'Unknown',
        country: components.country || 'India',
        address: result.formatted || 'Unknown Address',
      };
    } catch (error) {
      console.warn('Reverse geocoding failed, using fallback:', error);
      
      // Fallback to basic location data
      return {
        latitude,
        longitude,
        pincode: this.generateMockPincode(latitude, longitude),
        city: 'Unknown',
        state: 'Unknown',
        country: 'India',
        address: 'Unknown Address',
      };
    }
  }

  /**
   * Generate a mock pincode based on coordinates (fallback only)
   */
  private generateMockPincode(latitude: number, longitude: number): string {
    // Simple hash function to generate consistent mock pincodes
    const latStr = Math.abs(latitude).toString().replace('.', '');
    const lonStr = Math.abs(longitude).toString().replace('.', '');
    const combined = latStr + lonStr;
    
    // Take first 6 digits, pad with zeros if needed
    let pincode = combined.substring(0, 6);
    while (pincode.length < 6) {
      pincode += '0';
    }
    
    return pincode;
  }

  /**
   * Get position from pincode (forward geocoding)
   */
  async getPositionFromPincode(pincode: string): Promise<LocationData> {
    if (!pincode || !/^\d{6}$/.test(pincode)) {
      throw {
        type: 'INVALID_PINCODE',
        message: 'Please enter a valid 6-digit pincode',
        code: 'INVALID_PINCODE',
      } as GeolocationError;
    }

    try {
      if (!this.GEOCODING_API_KEY) {
        // Fallback to mock location data
        return {
          latitude: this.generateMockLatitude(pincode),
          longitude: this.generateMockLongitude(pincode),
          pincode,
          city: 'Unknown',
          state: 'Unknown',
          country: 'India',
          address: `Pincode ${pincode}`,
        };
      }

      const url = new URL(this.GEOCODING_API_URL);
      url.searchParams.append('q', pincode);
      url.searchParams.append('countrycode', 'in');
      url.searchParams.append('key', this.GEOCODING_API_KEY);
      url.searchParams.append('limit', '1');

      const response = await fetch(url.toString());
      
      if (!response.ok) {
        throw new Error(`Geocoding API request failed: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.results.length === 0) {
        throw {
          type: 'INVALID_PINCODE',
          message: 'No location found for the given pincode. Please check and try again.',
          code: 'PINCODE_NOT_FOUND',
        } as GeolocationError;
      }

      const result = data.results[0];
      const geometry = result.geometry;
      const components = result.components;

      return {
        latitude: geometry.lat,
        longitude: geometry.lng,
        pincode,
        city: components.city || components.town || components.village || 'Unknown',
        state: components.state || 'Unknown',
        country: components.country || 'India',
        address: result.formatted || `Pincode ${pincode}`,
      };
    } catch (error) {
      if ((error as GeolocationError).type === 'INVALID_PINCODE') {
        throw error;
      }

      console.warn('Forward geocoding failed, using fallback:', error);
      
      // Fallback to mock location data
      return {
        latitude: this.generateMockLatitude(pincode),
        longitude: this.generateMockLongitude(pincode),
        pincode,
        city: 'Unknown',
        state: 'Unknown',
        country: 'India',
        address: `Pincode ${pincode}`,
      };
    }
  }

  /**
   * Generate mock latitude from pincode (fallback only)
   */
  private generateMockLatitude(pincode: string): number {
    // Simple hash function to generate consistent mock coordinates
    const hash = parseInt(pincode.substring(0, 3)) / 1000;
    return 8.0 + (hash * 10); // Rough latitude range for India
  }

  /**
   * Generate mock longitude from pincode (fallback only)
   */
  private generateMockLongitude(pincode: string): number {
    // Simple hash function to generate consistent mock coordinates
    const hash = parseInt(pincode.substring(3, 6)) / 1000;
    return 68.0 + (hash * 20); // Rough longitude range for India
  }

  /**
   * Watch position changes (for real-time location updates)
   */
  watchPosition(
    callback: (position: LocationData) => void,
    errorCallback?: (error: GeolocationError) => void,
    options?: GeolocationOptions
  ): () => void {
    if (!this.isGeolocationSupported()) {
      if (errorCallback) {
        errorCallback({
          type: 'PERMISSION_DENIED',
          message: 'Geolocation is not supported in your browser',
          code: 1,
          recoverable: true,
        });
      }
      return () => {}; // Return empty function
    }

    const watchId = navigator.geolocation.watchPosition(
      async (position) => {
        try {
          const locationData = await this.reverseGeocode(
            position.coords.latitude,
            position.coords.longitude
          );
          callback(locationData);
        } catch (error) {
          if (errorCallback) {
            errorCallback(error as GeolocationError);
          }
        }
      },
      (error) => {
        if (errorCallback) {
          const geolocationError: GeolocationError = {
            type: 'TIMEOUT',
            message: error.message,
            code: error.code,
            recoverable: true,
            details: error,
          };
          errorCallback(geolocationError);
        }
      },
      { ...this.DEFAULT_OPTIONS, ...options }
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }

  /**
   * Calculate distance between two coordinates in kilometers
   */
  calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);
    
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * Convert degrees to radians
   */
  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }
}

// Export singleton instance
export const geolocationService = new GeolocationServiceImpl();