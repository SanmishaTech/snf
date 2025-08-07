import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { MapPin, X, Wifi, WifiOff } from 'lucide-react';
import { useLocationPermission } from '../hooks';

interface LocationPermissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPermissionGranted: () => void;
  onPermissionDenied: () => void;
}

export const LocationPermissionModal: React.FC<LocationPermissionModalProps> = ({
  isOpen,
  onClose,
  onPermissionGranted,
  onPermissionDenied,
}) => {
  const { requestPermission, isChecking } = useLocationPermission();
  const [isRequesting, setIsRequesting] = useState(false);

  const handleAllowLocation = async () => {
    try {
      setIsRequesting(true);
      const permission = await requestPermission();
      
      if (permission === 'granted') {
        onPermissionGranted();
      } else {
        onPermissionDenied();
      }
    } catch (error) {
      console.error('Error requesting location permission:', error);
      onPermissionDenied();
    } finally {
      setIsRequesting(false);
    }
  };

  const handleDenyLocation = () => {
    onPermissionDenied();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            Location Access Required
          </DialogTitle>
          <DialogDescription className="text-base">
            To show you accurate pricing and availability for your area, we need to know your location.
            This helps us connect you with the nearest depot and show you the best prices.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-muted/50 p-4 rounded-lg">
            <h4 className="font-medium mb-2">Why we need your location:</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <Wifi className="h-4 w-4 mt-0.5 text-green-500" />
                <span>Show accurate pricing for your specific area</span>
              </li>
              <li className="flex items-start gap-2">
                <Wifi className="h-4 w-4 mt-0.5 text-green-500" />
                <span>Check product availability at your nearest depot</span>
              </li>
              <li className="flex items-start gap-2">
                <Wifi className="h-4 w-4 mt-0.5 text-green-500" />
                <span>Provide faster delivery options</span>
              </li>
            </ul>
          </div>

          <div className="bg-muted/50 p-4 rounded-lg">
            <h4 className="font-medium mb-2">Your privacy is important:</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <span className="text-green-500">•</span>
                <span>We only use your location to find the nearest depot</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-500">•</span>
                <span>Your location data is not shared with third parties</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-500">•</span>
                <span>You can change your location preferences anytime</span>
              </li>
            </ul>
          </div>

          <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg">
            <h4 className="font-medium mb-2 text-amber-800">If you deny access:</h4>
            <div className="space-y-2 text-sm text-amber-700">
              <div className="flex items-start gap-2">
                <WifiOff className="h-4 w-4 mt-0.5" />
                <span>You'll need to manually enter your pincode</span>
              </div>
              <div className="flex items-start gap-2">
                <WifiOff className="h-4 w-4 mt-0.5" />
                <span>Pricing may not be as accurate for your area</span>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="flex flex-col sm:flex-row gap-2">
          <Button
            onClick={handleDenyLocation}
            variant="outline"
            className="sm:w-auto w-full"
            disabled={isRequesting || isChecking}
          >
            <X className="h-4 w-4 mr-2" />
            Enter Pincode Manually
          </Button>
          <Button
            onClick={handleAllowLocation}
            className="sm:w-auto w-full"
            disabled={isRequesting || isChecking}
          >
            <MapPin className="h-4 w-4 mr-2" />
            {isRequesting || isChecking ? 'Requesting...' : 'Allow Location Access'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

interface LocationPermissionBannerProps {
  onEnableLocation: () => void;
  onDismiss: () => void;
}

export const LocationPermissionBanner: React.FC<LocationPermissionBannerProps> = ({
  onEnableLocation,
  onDismiss,
}) => {
  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
      <div className="flex items-start gap-3">
        <MapPin className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
        <div className="flex-1">
          <h3 className="font-medium text-blue-900 mb-1">Get accurate pricing for your area</h3>
          <p className="text-sm text-blue-700 mb-3">
            Enable location access to see depot-specific pricing and check product availability in your area.
          </p>
          <div className="flex gap-2">
            <Button
              onClick={onEnableLocation}
              size="sm"
              className="bg-blue-600 hover:bg-blue-700"
            >
              Enable Location
            </Button>
            <Button
              onClick={onDismiss}
              size="sm"
              variant="outline"
              className="text-blue-700 border-blue-300 hover:bg-blue-100"
            >
              Maybe Later
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};