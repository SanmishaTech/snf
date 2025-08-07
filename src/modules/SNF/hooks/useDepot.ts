import { useState, useEffect, useCallback } from 'react';
import { Depot, PricingError, UseDepotReturn } from '../types';
import { depotMappingService } from '../services/depotMapping';

/**
 * Custom hook for managing depot information
 * 
 * @param pincode - User's pincode to determine optimal depot
 * @returns {UseDepotReturn} Depot state and functions
 */
export const useDepot = (pincode?: string): UseDepotReturn => {
  const [depot, setDepot] = useState<Depot | null>(null);
  const [error, setError] = useState<PricingError | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Set depot manually
  const setDepotManually = useCallback(async (depotData: Depot) => {
    setIsLoading(true);
    setError(null);

    try {
      // Validate depot data
      if (!depotData || !depotData.id) {
        throw {
          type: 'DEPOT_NOT_FOUND',
          message: 'Invalid depot data provided',
          code: 'INVALID_DEPOT_DATA',
          recoverable: false,
        } as PricingError;
      }

      setDepot(depotData);
    } catch (err) {
      const pricingError = err as PricingError;
      setError(pricingError);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Refresh depot information
  const refreshDepot = useCallback(async () => {
    if (!pincode) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const optimalDepot = await depotMappingService.getOptimalDepot(pincode);
      
      if (optimalDepot) {
        setDepot(optimalDepot);
      } else {
        // Fallback to online depot
        const onlineDepot = await depotMappingService.getOnlineDepot();
        if (onlineDepot) {
          setDepot(onlineDepot);
        } else {
          throw {
            type: 'DEPOT_NOT_FOUND',
            message: 'No depot available for your location',
            code: 'NO_DEPOT_AVAILABLE',
            recoverable: true,
          } as PricingError;
        }
      }
    } catch (err) {
      const pricingError = err as PricingError;
      setError(pricingError);
      
      // Try to get online depot as fallback
      try {
        const onlineDepot = await depotMappingService.getOnlineDepot();
        if (onlineDepot) {
          setDepot(onlineDepot);
          setError(null); // Clear error since we have a fallback
        }
      } catch (fallbackError) {
        console.error('Fallback to online depot failed:', fallbackError);
      }
    } finally {
      setIsLoading(false);
    }
  }, [pincode]);

  // Get optimal depot when pincode changes
  useEffect(() => {
    if (pincode) {
      refreshDepot();
    }
  }, [pincode, refreshDepot]);

  // Auto-refresh depot every 30 minutes
  useEffect(() => {
    if (!pincode || !depot) return;

    const interval = setInterval(() => {
      refreshDepot();
    }, 30 * 60 * 1000); // 30 minutes

    return () => clearInterval(interval);
  }, [pincode, depot, refreshDepot]);

  return {
    depot,
    error,
    isLoading,
    setDepot: setDepotManually,
    refreshDepot,
  };
};

/**
 * Hook for getting all available depots
 * 
 * @returns {Depot[]} List of all depots
 */
export const useAllDepots = () => {
  const [depots, setDepots] = useState<Depot[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<PricingError | null>(null);

  const fetchDepots = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const allDepots = await depotMappingService.getAllDepots();
      setDepots(allDepots);
    } catch (err) {
      const pricingError = {
        type: 'API_ERROR',
        message: 'Failed to fetch depots',
        code: 'DEPOTS_FETCH_FAILED',
        recoverable: true,
        details: err,
      } as PricingError;
      setError(pricingError);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDepots();
  }, [fetchDepots]);

  return {
    depots,
    isLoading,
    error,
    refetch: fetchDepots,
  };
};

/**
 * Hook for getting depots by location
 * 
 * @param latitude - Latitude coordinate
 * @param longitude - Longitude coordinate
 * @returns {Depot[]} List of nearby depots
 */
export const useDepotsByLocation = (latitude?: number, longitude?: number) => {
  const [depots, setDepots] = useState<Depot[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<PricingError | null>(null);

  const fetchDepotsByLocation = useCallback(async () => {
    if (!latitude || !longitude) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const nearbyDepots = await depotMappingService.getDepotsByLocation(latitude, longitude);
      setDepots(nearbyDepots);
    } catch (err) {
      const pricingError = {
        type: 'API_ERROR',
        message: 'Failed to fetch depots by location',
        code: 'DEPOTS_BY_LOCATION_FETCH_FAILED',
        recoverable: true,
        details: err,
      } as PricingError;
      setError(pricingError);
    } finally {
      setIsLoading(false);
    }
  }, [latitude, longitude]);

  useEffect(() => {
    if (latitude && longitude) {
      fetchDepotsByLocation();
    }
  }, [latitude, longitude, fetchDepotsByLocation]);

  return {
    depots,
    isLoading,
    error,
    refetch: fetchDepotsByLocation,
  };
};

/**
 * Hook for getting online depot
 * 
 * @returns {Depot | null} Online depot if available
 */
export const useOnlineDepot = () => {
  const [depot, setDepot] = useState<Depot | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<PricingError | null>(null);

  const fetchOnlineDepot = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const onlineDepot = await depotMappingService.getOnlineDepot();
      setDepot(onlineDepot);
    } catch (err) {
      const pricingError = {
        type: 'DEPOT_NOT_FOUND',
        message: 'No online depot available',
        code: 'NO_ONLINE_DEPOT',
        recoverable: false,
        details: err,
      } as PricingError;
      setError(pricingError);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOnlineDepot();
  }, [fetchOnlineDepot]);

  return {
    depot,
    isLoading,
    error,
    refetch: fetchOnlineDepot,
  };
};

/**
 * Hook for checking service availability
 * 
 * @param pincode - Pincode to check service availability for
 * @returns Service availability information
 */
export const useServiceAvailability = (pincode?: string) => {
  const [serviceAvailability, setServiceAvailability] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<PricingError | null>(null);

  const checkServiceAvailability = useCallback(async () => {
    if (!pincode) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const availability = await depotMappingService.validateServiceAvailability(pincode);
      setServiceAvailability(availability);
    } catch (err) {
      const pricingError = {
        type: 'API_ERROR',
        message: 'Failed to check service availability',
        code: 'SERVICE_AVAILABILITY_CHECK_FAILED',
        recoverable: true,
        details: err,
      } as PricingError;
      setError(pricingError);
    } finally {
      setIsLoading(false);
    }
  }, [pincode]);

  useEffect(() => {
    if (pincode) {
      checkServiceAvailability();
    }
  }, [pincode, checkServiceAvailability]);

  return {
    serviceAvailability,
    isLoading,
    error,
    refetch: checkServiceAvailability,
  };
};