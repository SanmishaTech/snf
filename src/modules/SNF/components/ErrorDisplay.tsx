import React from 'react';
import { AlertTriangle, RefreshCw, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { PricingError, GeolocationError } from '../types';

interface ErrorDisplayProps {
  error: PricingError | GeolocationError | null;
  onRetry?: () => void;
  onDismiss?: () => void;
  className?: string;
}

export const ErrorDisplay: React.FC<ErrorDisplayProps> = ({
  error,
  onRetry,
  onDismiss,
  className = '',
}) => {
  if (!error) return null;

  const getErrorTitle = (error: PricingError | GeolocationError): string => {
    switch (error.type) {
      case 'PERMISSION_DENIED':
        return 'Location Access Denied';
      case 'POSITION_UNAVAILABLE':
        return 'Location Unavailable';
      case 'TIMEOUT':
        return 'Location Request Timeout';
      case 'INVALID_PINCODE':
        return 'Invalid Pincode';
      case 'API_ERROR':
        return 'Connection Error';
      case 'DEPOT_NOT_FOUND':
        return 'Service Unavailable';
      case 'NETWORK_ERROR':
        return 'Network Error';
      case 'CACHE_ERROR':
        return 'Cache Error';
      default:
        return 'Something Went Wrong';
    }
  };

  const getErrorDescription = (error: PricingError | GeolocationError): string => {
    switch (error.type) {
      case 'PERMISSION_DENIED':
        return 'Please enable location access in your browser settings or enter your pincode manually to see products available in your area.';
      case 'POSITION_UNAVAILABLE':
        return 'We couldn\'t determine your location. Please enter your pincode manually to continue.';
      case 'TIMEOUT':
        return 'Location request took too long. Please try again or enter your pincode manually.';
      case 'INVALID_PINCODE':
        return 'The pincode you entered is not valid. Please check and try again.';
      case 'API_ERROR':
        return 'We\'re having trouble connecting to our servers. Please check your internet connection and try again.';
      case 'DEPOT_NOT_FOUND':
        return 'We couldn\'t find a depot that serves your area. Please check your pincode or try a nearby location.';
      case 'NETWORK_ERROR':
        return 'Please check your internet connection and try again.';
      case 'CACHE_ERROR':
        return 'There was a problem loading cached data. Please refresh the page and try again.';
      default:
        return (error as any).message || 'An unexpected error occurred. Please try again.';
    }
  };

  const isRecoverable = error.recoverable !== false;

  return (
    <Alert variant="destructive" className={`relative ${className}`}>
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>{getErrorTitle(error)}</AlertTitle>
      <AlertDescription className="mt-2">
        {getErrorDescription(error)}
      </AlertDescription>
      
      <div className="mt-4 flex gap-2">
        {isRecoverable && onRetry && (
          <Button
            variant="outline"
            size="sm"
            onClick={onRetry}
            className="h-8"
          >
            <RefreshCw className="mr-2 h-3 w-3" />
            Try Again
          </Button>
        )}
        
        {onDismiss && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onDismiss}
            className="h-8"
          >
            <X className="mr-2 h-3 w-3" />
            Dismiss
          </Button>
        )}
      </div>
    </Alert>
  );
};

interface ErrorCardProps {
  error: PricingError | GeolocationError | null;
  onRetry?: () => void;
  onDismiss?: () => void;
  className?: string;
}

export const ErrorCard: React.FC<ErrorCardProps> = ({
  error,
  onRetry,
  onDismiss,
  className = '',
}) => {
  if (!error) return null;

  const getErrorTitle = (error: PricingError | GeolocationError): string => {
    switch (error.type) {
      case 'PERMISSION_DENIED':
        return 'Location Access Required';
      case 'POSITION_UNAVAILABLE':
        return 'Location Service Unavailable';
      case 'TIMEOUT':
        return 'Location Request Timeout';
      case 'INVALID_PINCODE':
        return 'Invalid Pincode';
      case 'API_ERROR':
        return 'Service Temporarily Unavailable';
      case 'DEPOT_NOT_FOUND':
        return 'Service Not Available in Your Area';
      case 'NETWORK_ERROR':
        return 'Network Connection Error';
      case 'CACHE_ERROR':
        return 'Data Loading Error';
      default:
        return 'Something Went Wrong';
    }
  };

  const getErrorDescription = (error: PricingError | GeolocationError): string => {
    switch (error.type) {
      case 'PERMISSION_DENIED':
        return 'To show you products and prices from your nearest depot, we need access to your location. You can also enter your pincode manually.';
      case 'POSITION_UNAVAILABLE':
        return 'We\'re unable to determine your current location. Please enter your pincode to see products available in your area.';
      case 'TIMEOUT':
        return 'The location request took too long to complete. Please try again or enter your pincode manually.';
      case 'INVALID_PINCODE':
        return 'The pincode you entered doesn\'t appear to be valid. Please check the number and try again.';
      case 'API_ERROR':
        return 'Our servers are experiencing technical difficulties. Please try again in a few moments.';
      case 'DEPOT_NOT_FOUND':
        return 'Unfortunately, we don\'t currently deliver to your area. Please check if you entered the correct pincode.';
      case 'NETWORK_ERROR':
        return 'Please check your internet connection and try again. Make sure you\'re online to browse our products.';
      case 'CACHE_ERROR':
        return 'There was a problem loading product data. Please refresh the page to try again.';
      default:
        return (error as any).message || 'An unexpected error occurred while loading the page. Please try refreshing.';
    }
  };

  const getErrorAction = (error: PricingError | GeolocationError): string => {
    switch (error.type) {
      case 'PERMISSION_DENIED':
        return 'Enable Location';
      case 'POSITION_UNAVAILABLE':
      case 'TIMEOUT':
      case 'INVALID_PINCODE':
        return 'Enter Pincode';
      case 'API_ERROR':
      case 'NETWORK_ERROR':
      case 'CACHE_ERROR':
        return 'Retry';
      case 'DEPOT_NOT_FOUND':
        return 'Check Pincode';
      default:
        return 'Try Again';
    }
  };

  const isRecoverable = error.recoverable !== false;

  return (
    <div className={`bg-destructive/10 border border-destructive/20 rounded-lg p-6 ${className}`}>
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0">
          <AlertTriangle className="h-6 w-6 text-destructive" />
        </div>
        
        <div className="flex-1 space-y-2">
          <h3 className="text-lg font-semibold text-destructive">
            {getErrorTitle(error)}
          </h3>
          
          <p className="text-sm text-muted-foreground">
            {getErrorDescription(error)}
          </p>
          
          {isRecoverable && onRetry && (
            <Button
              variant="destructive"
              size="sm"
              onClick={onRetry}
              className="mt-3"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              {getErrorAction(error)}
            </Button>
          )}
        </div>
        
        {onDismiss && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onDismiss}
            className="flex-shrink-0 h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
};

export default ErrorDisplay;