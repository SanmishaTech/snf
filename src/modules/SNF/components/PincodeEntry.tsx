import React, { useState } from 'react';
import { MapPin, Navigation, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { GeolocationError } from '../types';

interface PincodeEntryProps {
  onPincodeSubmit: (pincode: string) => Promise<void>;
  onLocationRequest: () => Promise<void>;
  isLoading?: boolean;
  error?: GeolocationError | null;
}

export const PincodeEntry: React.FC<PincodeEntryProps> = ({
  onPincodeSubmit,
  onLocationRequest,
  isLoading = false,
  error = null,
}) => {
  const [pincode, setPincode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLocating, setIsLocating] = useState(false);

  const handlePincodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pincode.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await onPincodeSubmit(pincode.trim());
    } catch (error) {
      console.error('Error submitting pincode:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLocationRequest = async () => {
    if (isLocating) return;

    setIsLocating(true);
    try {
      await onLocationRequest();
    } catch (error) {
      console.error('Error requesting location:', error);
    } finally {
      setIsLocating(false);
    }
  };

  const getErrorMessage = (error: GeolocationError | null): string => {
    if (!error) return '';

    switch (error.type) {
      case 'PERMISSION_DENIED':
        return 'Location access denied. Please enter your pincode manually.';
      case 'POSITION_UNAVAILABLE':
        return 'Unable to get your location. Please enter your pincode manually.';
      case 'TIMEOUT':
        return 'Location request timed out. Please try again or enter your pincode.';
      case 'INVALID_PINCODE':
        return 'Please enter a valid 6-digit pincode.';
      default:
        return error.message || 'An error occurred. Please try again.';
    }
  };

  const isButtonDisabled = isLoading || isSubmitting || isLocating;

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <CardTitle className="flex items-center justify-center gap-2">
          <MapPin className="h-5 w-5" />
          Set Your Delivery Location
        </CardTitle>
        <CardDescription>
          Enter your pincode or use your current location to see products and prices available in your area
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={handlePincodeSubmit} className="space-y-3">
          <div>
            <Input
              type="text"
              placeholder="Enter 6-digit pincode"
              value={pincode}
              onChange={(e) => {
                // Only allow numbers
                const value = e.target.value.replace(/\D/g, '');
                // Limit to 6 digits
                if (value.length <= 6) {
                  setPincode(value);
                }
              }}
              maxLength={6}
              disabled={isButtonDisabled}
              className="text-center"
              aria-label="Enter your pincode"
            />
          </div>
          
          <Button
            type="submit"
            className="w-full"
            disabled={!pincode.trim() || isButtonDisabled}
            aria-label="Submit pincode"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Checking...
              </>
            ) : (
              'Check Availability'
            )}
          </Button>
        </form>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">Or</span>
          </div>
        </div>

        <Button
          variant="outline"
          className="w-full"
          onClick={handleLocationRequest}
          disabled={isButtonDisabled}
          aria-label="Use current location"
        >
          {isLocating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Getting Location...
            </>
          ) : (
            <>
              <Navigation className="mr-2 h-4 w-4" />
              Use Current Location
            </>
          )}
        </Button>

        {error && (
          <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
            {getErrorMessage(error)}
          </div>
        )}

        <div className="text-xs text-muted-foreground text-center">
          <p>We'll use your location to show you products and prices from the nearest depot.</p>
          <p className="mt-1">Your location data is secure and will not be shared.</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default PincodeEntry;