/**
 * Utility to trigger storage events for same-tab updates
 * Since localStorage events don't fire in the same tab that made the change,
 * we need to manually trigger events for components to update
 */

export const triggerStorageEvent = (key: string, newValue: string | null, oldValue: string | null = null) => {
  // Create a custom storage event
  const event = new StorageEvent('storage', {
    key,
    newValue,
    oldValue,
    storageArea: localStorage,
    url: window.location.href,
  });

  // Dispatch the event
  window.dispatchEvent(event);
};

export const triggerDeliveryLocationUpdate = () => {
  const currentLocation = localStorage.getItem('snf.deliveryLocation');
  triggerStorageEvent('snf.deliveryLocation', currentLocation);
};

export default {
  triggerStorageEvent,
  triggerDeliveryLocationUpdate,
};