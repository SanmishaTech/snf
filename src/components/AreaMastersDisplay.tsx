import React, { useState, useMemo } from 'react';
import { MapPin, Truck, Search, Package, Phone, Building2, Clock } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAreaMasters, type AreaMaster } from '@/hooks/useAreaMasters';

interface AreaMastersDisplayProps {
  title?: string;
  showDeliveryInfo?: boolean;
  showDairyOnly?: boolean;
}

const AreaMastersDisplay: React.FC<AreaMastersDisplayProps> = ({ 
  title = "Home Delivery Areas", 
  showDeliveryInfo = true,
  showDairyOnly = false
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const { data: areaMasters = [], isLoading, isError } = useAreaMasters();
  const areaList = Array.isArray(areaMasters) ? areaMasters : [];

  // Filter area masters based on search and dairy filter
  const filteredAreaMasters = useMemo(() => {
    let filtered = areaList;
    
    // Only show Hand Delivery areas (filter out Courier)
    filtered = filtered.filter(am => am.deliveryType === 'HandDelivery');
    
    // Filter by dairy products if needed
    if (showDairyOnly) {
      filtered = filtered.filter(am => am.isDairyProduct);
    }
    
    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(areaMaster =>
        areaMaster.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        areaMaster.pincodes.includes(searchTerm) ||
        areaMaster.depot?.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    return filtered;
  }, [areaList, searchTerm, showDairyOnly]);

  // Since we're only showing Hand Delivery areas, no need to group
  const handDeliveryAreas = filteredAreaMasters;

  // Parse pincodes for display
  const formatPincodes = (pincodes: string) => {
    if (!pincodes || pincodes.trim() === '') return [];
    
    // Try to parse as JSON array first
    try {
      const parsed = JSON.parse(pincodes);
      if (Array.isArray(parsed)) {
        return parsed.slice(0, 5).map(p => String(p).trim()).filter(Boolean);
      }
    } catch {
      // Not JSON, continue with string processing
    }
    
    // Check if it contains commas or other separators
    if (pincodes.includes(',')) {
      return pincodes.split(',').slice(0, 5).map(p => p.trim()).filter(Boolean);
    } else if (pincodes.includes(';')) {
      return pincodes.split(';').slice(0, 5).map(p => p.trim()).filter(Boolean);
    } else if (pincodes.includes('|')) {
      return pincodes.split('|').slice(0, 5).map(p => p.trim()).filter(Boolean);
    } else {
      // Single pincode or space-separated
      const spaceSeparated = pincodes.trim().split(/\s+/);
      if (spaceSeparated.length > 1) {
        return spaceSeparated.slice(0, 5).filter(Boolean);
      }
      // Single pincode
      return [pincodes.trim()];
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-6 w-48" />
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="w-full">
              <CardHeader>
                <Skeleton className="h-6 w-32" />
              </CardHeader>
              <CardContent className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="text-center py-8">
        <MapPin className="mx-auto h-12 w-12 mb-4 text-gray-400" />
        <p className="text-gray-500 font-medium">Failed to load delivery areas</p>
        <p className="text-sm text-gray-400 mt-1">Please try again later</p>
      </div>
    );
  }

  if (areaList.length === 0) {
    return (
      <div className="text-center py-8">
        <MapPin className="mx-auto h-12 w-12 mb-4 text-gray-400" />
        <p className="text-gray-500 font-medium">No delivery areas available</p>
        <p className="text-sm text-gray-400 mt-1">We're expanding our coverage soon</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {showDeliveryInfo && (
        <div className="bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-xl p-6">
          <div className="flex items-start gap-3">
            <div className="bg-green-100 p-2 rounded-lg">
              <Truck className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">We deliver to the following areas:</h3>
              <p className="text-sm text-gray-600 mb-2">
                Fresh products delivered daily to your doorstep. Select your area during checkout to confirm delivery availability.
              </p>
              <div className="flex flex-wrap gap-2 mt-3">
                <Badge variant="secondary" className="bg-green-100 text-green-700">
                  <Package className="h-3 w-3 mr-1" />
                  {areaList.filter(am => am.isDairyProduct).length} Dairy Areas
                </Badge>
                <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                  <Truck className="h-3 w-3 mr-1" />
                  {areaList.filter(am => am.deliveryType === 'HandDelivery').length} Hand Delivery Areas
                </Badge>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
        <Input
          type="text"
          placeholder="Search by area name, pincode, or depot..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 bg-white"
        />
      </div>

      {/* Results */}
      {filteredAreaMasters.length === 0 && searchTerm && (
        <div className="text-center py-8">
          <Search className="mx-auto h-8 w-8 mb-3 text-gray-400" />
          <p className="text-gray-500">No areas found for "{searchTerm}"</p>
          <p className="text-sm text-gray-400 mt-1">Try a different search term or pincode</p>
        </div>
      )}

      {/* Hand Delivery Areas */}
      {handDeliveryAreas.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="bg-green-100 p-2 rounded-lg">
              <Truck className="h-5 w-5 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">Hand Delivery Areas</h3>
            <Badge variant="secondary" className="bg-green-100 text-green-700">
              {handDeliveryAreas.length} areas
            </Badge>
          </div>
          
          <div className="grid gap-4 md:grid-cols-2">
            {handDeliveryAreas.map((areaMaster) => (
              <Card key={areaMaster.id} className="hover:shadow-md transition-shadow border-green-100">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-base font-semibold text-gray-900 flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-green-600" />
                      {areaMaster.name}
                    </CardTitle>
                    <div className="flex gap-1">
                      <Badge variant="secondary" className="bg-green-100 text-green-700 text-xs">
                        Hand Delivery
                      </Badge>
                      {areaMaster.isDairyProduct && (
                        <Badge variant="secondary" className="bg-blue-100 text-blue-700 text-xs">
                          Dairy
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0 space-y-3">
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-1">Pincodes Covered:</p>
                    <div className="flex flex-wrap gap-1">
                      {formatPincodes(areaMaster.pincodes).map((pincode, idx) => (
                        <span key={idx} className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs">
                          {pincode}
                        </span>
                      ))}
                    </div>
                  </div>
                  
                  {/* {areaMaster.depot && (
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                        <Building2 className="h-3 w-3" />
                        Serviced by: {areaMaster.depot.name}
                      </p>
                      <p className="text-xs text-gray-600">{areaMaster.depot.address}</p>
                      <Badge 
                        variant="outline" 
                        className={`mt-1 text-xs ${areaMaster.depot.isOnline ? 'border-green-300 text-green-700' : 'border-gray-300 text-gray-700'}`}
                      >
                        {areaMaster.depot.isOnline ? 'Online Depot' : 'Offline Depot'}
                      </Badge>
                    </div>
                  )} */}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}


      {/* {showDeliveryInfo && (
        <Card className="bg-gray-50 border-gray-200">
          <CardHeader>
            <CardTitle className="text-base font-semibold text-gray-900 flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Delivery Information
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <h4 className="font-medium text-gray-800 mb-2">Hand Delivery</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Timing: 6:00 AM - 9:30 AM</li>
                  <li>• Fresh products delivered daily</li>
                  <li>• Personal touch with quality assurance</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium text-gray-800 mb-2">Courier Service</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Extended delivery hours</li>
                  <li>• Reliable courier partners</li>
                  <li>• Tracking available</li>
                </ul>
              </div>
            </div>
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-700">
                <strong>Don't see your area?</strong> Contact us and we'll try to expand our delivery network to include your location.
              </p>
            </div>
          </CardContent>
        </Card>
      )} */}
    </div>
  );
};

export default AreaMastersDisplay;