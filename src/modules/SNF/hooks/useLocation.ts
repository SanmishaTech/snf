import { useState, useEffect, useCallback } from 'react';
import { 
  LocationData, 
  GeolocationError, 
  GeolocationOptions, 
  UseLocationReturn 
} from '../types';
import { geolocationService } from '../services/geolocation';

/**
 * Custom hook for managing user location
 * 
 * @returns {UseLocationReturn} Location state and functions
 */
export const useLocation = (): UseLocationReturn => {
  const [location, setLocation] = useState<LocationData | null>(null);
  const [error, setError] = useState<GeolocationError | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [permissionGranted, setPermissionGranted] = useState(false);

  // Check if geolocation is supported
  const isGeolocationSupported = geolocationService.isGeolocationSupported();

  // Request location with explanation
  const requestLocation = useCallback(async (options?: GeolocationOptions) => {
    if (!isGeolocationSupported) {
      const error: GeolocationError = {
        type: 'PERMISSION_DENIED',
        message: 'Geolocation is not supported in your browser. Please enter your pincode manually.',
        code: 1,
        recoverable: true,
      };
      setError(error);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Check permission status first
      const permissionStatus = await geolocationService.checkPermissionStatus();
      setPermissionGranted(permissionStatus === 'granted');

      // Request location with explanation
      const locationData = await geolocationService.requestLocationWithExplanation(options);
      setLocation(locationData);
      setPermissionGranted(true);
    } catch (err) {
      const geolocationError = err as GeolocationError;
      setError(geolocationError);
      setPermissionGranted(false);
    } finally {
      setIsLoading(false);
    }
  }, [isGeolocationSupported]);

  // Set manual pincode
  const setManualPincode = useCallback(async (pincode: string) => {
    setIsLoading(true);
    setError(null);

    try {
      // Validate pincode format (6 digits for India)
      if (!/^\d{6}$/.test(pincode)) {
        throw {
          type: 'INVALID_PINCODE',
          message: 'Please enter a valid 6-digit pincode',
          code: 'INVALID_PINCODE_FORMAT',
          recoverable: true,
        } as GeolocationError;
      }

      // Get location data from pincode
      const locationData = await geolocationService.getPositionFromPincode(pincode);
      setLocation(locationData);
    } catch (err) {
      const geolocationError = err as GeolocationError;
      setError(geolocationError);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Auto-request location on mount if supported
  useEffect(() => {
    if (isGeolocationSupported) {
      // Don't auto-request, let the user trigger it
      // This prevents unexpected permission prompts
    }
  }, [isGeolocationSupported]);

  // Cleanup any active watchers on unmount
  useEffect(() => {
    return () => {
      // Cleanup any active geolocation watchers
      // This is handled by the geolocation service
    };
  }, []);

  return {
    location,
    error,
    isLoading,
    requestLocation,
    setManualPincode,
    permissionGranted,
  };
};

/**
 * Hook for watching location changes
 * 
 * @param callback - Function to call when location changes
 * @param errorCallback - Function to call when an error occurs
 * @param options - Geolocation options
 * @returns Function to stop watching
 */
export const useLocationWatcher = (
  callback: (position: LocationData) => void,
  errorCallback?: (error: GeolocationError) => void,
  options?: GeolocationOptions
): (() => void) => {
  useEffect(() => {
    if (!geolocationService.isGeolocationSupported()) {
      return;
    }

    const stopWatching = geolocationService.watchPosition(
      callback,
      errorCallback,
      options
    );

    return () => {
      stopWatching();
    };
  }, [callback, errorCallback, options]);

  // Return a no-op function for consistency
  return () => {};
};

/**
 * Hook for getting distance between two points
 * 
 * @returns Function to calculate distance
 */
export const useDistanceCalculator = () => {
  const calculateDistance = useCallback(
    (lat1: number, lon1: number, lat2: number, lon2: number): number => {
      return geolocationService.calculateDistance(lat1, lon1, lat2, lon2);
    },
    []
  );

  return calculateDistance;
};

/**
 * Hook for checking location permission status
 * 
 * @returns Permission status and function to check it
 */
export const useLocationPermission = () => {
  const [permissionStatus, setPermissionStatus] = useState<PermissionState>('prompt');
  const [isLoading, setIsLoading] = useState(false);

  const checkPermission = useCallback(async () => {
    if (!geolocationService.isGeolocationSupported()) {
      setPermissionStatus('denied');
      return 'denied';
    }

    setIsLoading(true);
    try {
      const status = await geolocationService.checkPermissionStatus();
      setPermissionStatus(status);
      return status;
    } catch (error) {
      setPermissionStatus('denied');
      return 'denied';
    } finally {
      setIsLoading(false);
    }
  }, []);

  const requestPermission = useCallback(async () => {
    if (!geolocationService.isGeolocationSupported()) {
      setPermissionStatus('denied');
      return 'denied';
    }

    setIsLoading(true);
    try {
      const status = await geolocationService.requestPermission();
      setPermissionStatus(status);
      return status;
    } catch (error) {
      setPermissionStatus('denied');
      return 'denied';
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    permissionStatus,
    isLoading,
    checkPermission,
    requestPermission,
  };
};