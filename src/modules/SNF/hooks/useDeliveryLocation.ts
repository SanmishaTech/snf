import { useState, useEffect } from 'react';
import { DeliveryLocationService } from '@/services/deliveryLocationService';

/**
 * Custom hook to manage depot ID from stored delivery location
 * Automatically updates when the delivery location changes in localStorage
 */
export const useDeliveryLocation = () => {
  const [currentDepotId, setCurrentDepotId] = useState<number>(() => {
    const deliveryLocation = DeliveryLocationService.getCurrentLocation();
    return deliveryLocation?.depotId ? parseInt(deliveryLocation.depotId) : 1; // Default to depot 1
  });

  const [deliveryLocation, setDeliveryLocation] = useState(() => {
    return DeliveryLocationService.getCurrentLocation();
  });

  useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      // Only handle changes to our specific key
      if (event.key === 'snf.deliveryLocation' || event.key === null) {
        const newDeliveryLocation = DeliveryLocationService.getCurrentLocation();
        const newDepotId = newDeliveryLocation?.depotId ? parseInt(newDeliveryLocation.depotId) : 1;
        
        console.log('Delivery location changed:', {
          oldDepotId: currentDepotId,
          newDepotId,
          newLocation: newDeliveryLocation
        });
        
        if (newDepotId !== currentDepotId) {
          setCurrentDepotId(newDepotId);
        }
        
        setDeliveryLocation(newDeliveryLocation);
      }
    };

    // Listen for storage changes (both cross-tab and same-tab)
    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [currentDepotId]);

  return {
    currentDepotId,
    deliveryLocation,
    hasDeliveryLocation: DeliveryLocationService.hasDeliveryLocation(),
    getCurrentDepotId: DeliveryLocationService.getCurrentDepotId,
  };
};

export default useDeliveryLocation;