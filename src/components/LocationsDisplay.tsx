import React, { useState, useMemo } from 'react';
import { MapPin, Truck, Search } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { useLocations, type Location } from '@/hooks/useLocations';

interface LocationsDisplayProps {
  title?: string;
  showDeliveryInfo?: boolean;
}

const LocationsDisplay: React.FC<LocationsDisplayProps> = ({ 
  title = "Home Delivery Areas", 
  showDeliveryInfo = true 
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const { data: locations = [], isLoading, isError } = useLocations();

// Filter and group locations by city
  const filteredLocations = useMemo(() => {
    return locations.filter(location =>
      location.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      location.city.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [locations, searchTerm]);

  const locationsByCity = filteredLocations.reduce((acc, location) => {
    const cityName = location.city.name;
    if (!acc[cityName]) {
      acc[cityName] = [];
    }
    acc[cityName].push(location);
    return acc;
  }, {} as Record<string, Location[]>);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-6 w-48" />
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="text-center py-6">
        <MapPin className="mx-auto h-8 w-8 mb-2 text-gray-400" />
        <p className="text-gray-500">Failed to load delivery locations</p>
        <p className="text-sm text-gray-400 mt-1">Please try again later</p>
      </div>
    );
  }

  if (locations.length === 0) {
    return (
      <div className="text-center py-6">
        <MapPin className="mx-auto h-8 w-8 mb-2 text-gray-400" />
        <p className="text-gray-500">No delivery locations available</p>
      </div>
    );
  }

  return (
    <div>
      {showDeliveryInfo && (
        <div className="mb-4 p-4 bg-primary border border-green-200 rounded-lg">
          <p className="text-sm text-white mb-2">
            <strong>We deliver to the following areas:</strong>
          </p>
          <p className="text-xs text-white">
            Fresh milk delivered daily to your doorstep. Select your area during checkout to confirm delivery availability.
          </p>
        </div>
      )}

      {/* Search Bar */}
      <div className="mb-4 relative">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            type="text"
            placeholder="Search locations by name or city..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <div className="space-y-6">
        {Object.entries(locationsByCity).length === 0 && searchTerm && (
          <div className="text-center py-6">
            <Search className="mx-auto h-8 w-8 mb-2 text-gray-400" />
            <p className="text-gray-500">No locations found for "{searchTerm}"</p>
            <p className="text-sm text-gray-400 mt-1">Try a different search term</p>
          </div>
        )}
        
        {Object.entries(locationsByCity).map(([cityName, cityLocations]) => (
          <div key={cityName} className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="text-lg font-semibold mb-3 text-blue-800 flex items-center gap-2">
              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
              {cityName}
            </h3>
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {cityLocations.map((location) => (
                <div
                  key={location.id}
                  className="flex items-center gap-2 p-2 bg-white rounded border border-blue-100 hover:bg-blue-25 transition-colors"
                >
                  <div className="w-2 h-2 bg-primary rounded-full"></div>
                  <span className="text-sm text-gray-800">{location.name}</span>
                  <span className="text-xs bg-primary text-white px-2 py-1 rounded-full ml-auto">
                    Available
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {showDeliveryInfo && (
        <div className="mt-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
          <h4 className="font-semibold text-gray-900 mb-2">Delivery Information:</h4>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>• Delivery timing: 6:00 AM - 9:30 AM</li>
            <li>• Fresh milk delivered daily to your doorstep</li>
            <li>• Contact us if your area is not listed above</li>
          </ul>
        </div>
      )}
    </div>
  );
};

export default LocationsDisplay;
