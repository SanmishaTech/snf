import React from 'react';
import { useDeliveryLocation } from '../hooks/useDeliveryLocation';
import { DeliveryLocationService } from '@/services/deliveryLocationService';

/**
 * Debug component to test delivery location functionality
 * This can be temporarily added to any page to test the localStorage integration
 */
export const DeliveryLocationDebug: React.FC = () => {
  const { currentDepotId, deliveryLocation, hasDeliveryLocation } = useDeliveryLocation();

  const testSetPincode = async (pincode: string) => {
    try {
      const location = await DeliveryLocationService.updateLocationByPincode(pincode);
      console.log('Updated location:', location);
    } catch (error) {
      console.error('Failed to update location:', error);
    }
  };

  const clearLocation = () => {
    DeliveryLocationService.clearCurrentLocation();
  };

  return (
    <div className="fixed bottom-4 right-4 bg-white border border-gray-300 rounded-lg p-4 shadow-lg z-50 max-w-sm">
      <h3 className="font-bold text-sm mb-2">Delivery Location Debug</h3>
      <div className="text-xs space-y-1">
        <div>Depot ID: {currentDepotId}</div>
        <div>Has Location: {hasDeliveryLocation ? 'Yes' : 'No'}</div>
        <div>Pincode: {deliveryLocation?.pincode || 'None'}</div>
        <div>Depot Name: {deliveryLocation?.depotName || 'None'}</div>
        <div>Area: {deliveryLocation?.areaName || 'None'}</div>
      </div>
      <div className="mt-2 space-y-1">
        <button
          onClick={() => testSetPincode('110001')}
          className="block w-full text-xs bg-blue-500 text-white px-2 py-1 rounded"
        >
          Test Delhi (110001)
        </button>
        <button
          onClick={() => testSetPincode('400001')}
          className="block w-full text-xs bg-green-500 text-white px-2 py-1 rounded"
        >
          Test Mumbai (400001)
        </button>
        <button
          onClick={clearLocation}
          className="block w-full text-xs bg-red-500 text-white px-2 py-1 rounded"
        >
          Clear Location
        </button>
      </div>
    </div>
  );
};

export default DeliveryLocationDebug;