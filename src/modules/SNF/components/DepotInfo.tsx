import React from 'react';
import { MapPin, Truck, Clock, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Depot, ServiceAvailability } from '../types';

interface DepotInfoProps {
  depot: Depot | null;
  serviceAvailability: ServiceAvailability | null;
  onRefresh?: () => void;
  onChangeLocation?: () => void;
  isLoading?: boolean;
}

export const DepotInfo: React.FC<DepotInfoProps> = ({
  depot,
  serviceAvailability,
  onRefresh,
  onChangeLocation,
  isLoading = false,
}) => {
  if (!depot) {
    return null;
  }

  const isOnline = depot.isOnline;
  const isServiceAvailable = serviceAvailability?.isAvailable ?? false;

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <MapPin className="h-4 w-4" />
            Your Delivery Location
          </CardTitle>
          
          <div className="flex items-center gap-2">
            {onRefresh && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onRefresh}
                disabled={isLoading}
                className="h-8 w-8 p-0"
                aria-label="Refresh depot information"
              >
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              </Button>
            )}
            
            {onChangeLocation && (
              <Button
                variant="outline"
                size="sm"
                onClick={onChangeLocation}
                disabled={isLoading}
                className="h-8"
              >
                Change
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-3">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Depot</span>
            <div className="flex items-center gap-2">
              <span className="text-sm">{depot.name}</span>
              <Badge variant={isOnline ? 'default' : 'secondary'}>
                {isOnline ? 'Online' : 'Offline'}
              </Badge>
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Service Status</span>
            <Badge variant={isServiceAvailable ? 'default' : 'destructive'}>
              {isServiceAvailable ? 'Available' : 'Unavailable'}
            </Badge>
          </div>
          
          {serviceAvailability?.estimatedDeliveryTime && (
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Delivery Time
              </span>
              <span className="text-sm">{serviceAvailability.estimatedDeliveryTime}</span>
            </div>
          )}
          
          {serviceAvailability?.deliveryCharges !== undefined && (
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium flex items-center gap-1">
                <Truck className="h-3 w-3" />
                Delivery Charges
              </span>
              <span className="text-sm">
                {serviceAvailability.deliveryCharges === 0 ? 'Free' : `₹${serviceAvailability.deliveryCharges}`}
              </span>
            </div>
          )}
          
          {serviceAvailability?.minimumOrderAmount && (
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Min. Order Amount</span>
              <span className="text-sm">₹{serviceAvailability.minimumOrderAmount}</span>
            </div>
          )}
        </div>
        
        {serviceAvailability?.message && (
          <div className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
            {serviceAvailability.message}
          </div>
        )}
        
        <div className="text-xs text-muted-foreground">
          <p>Prices and availability are specific to your location and selected depot.</p>
        </div>
      </CardContent>
    </Card>
  );
};

interface CompactDepotInfoProps {
  depot: Depot | null;
  serviceAvailability: ServiceAvailability | null;
  onChangeLocation?: () => void;
}

export const CompactDepotInfo: React.FC<CompactDepotInfoProps> = ({
  depot,
  serviceAvailability,
  onChangeLocation,
}) => {
  if (!depot) {
    return null;
  }

  const isOnline = depot.isOnline;
  const isServiceAvailable = serviceAvailability?.isAvailable ?? false;

  return (
    <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
      <div className="flex items-center gap-3">
        <MapPin className="h-4 w-4 text-muted-foreground" />
        <div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">{depot.name}</span>
            <Badge variant={isOnline ? 'default' : 'secondary'} className="text-xs">
              {isOnline ? 'Online' : 'Offline'}
            </Badge>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant={isServiceAvailable ? 'default' : 'destructive'} className="text-xs">
              {isServiceAvailable ? 'Service Available' : 'Service Unavailable'}
            </Badge>
            {serviceAvailability?.estimatedDeliveryTime && (
              <span className="text-xs text-muted-foreground">
                {serviceAvailability.estimatedDeliveryTime}
              </span>
            )}
          </div>
        </div>
      </div>
      
      {onChangeLocation && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onChangeLocation}
          className="h-8 text-xs"
        >
          Change
        </Button>
      )}
    </div>
  );
};

interface DepotBadgeProps {
  depot: Depot | null;
  serviceAvailability: ServiceAvailability | null;
}

export const DepotBadge: React.FC<DepotBadgeProps> = ({
  depot,
  serviceAvailability,
}) => {
  if (!depot) {
    return null;
  }

  const isOnline = depot.isOnline;
  const isServiceAvailable = serviceAvailability?.isAvailable ?? false;

  return (
    <div className="flex items-center gap-2">
      <Badge variant={isServiceAvailable ? 'default' : 'destructive'} className="text-xs">
        {depot.name}
      </Badge>
      {!isServiceAvailable && (
        <Badge variant="outline" className="text-xs">
          Service Unavailable
        </Badge>
      )}
    </div>
  );
};

export default DepotInfo;