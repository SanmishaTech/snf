import React, { useState, useMemo } from 'react';
import { MapPin, Truck, Search } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { useAreaMasters, type AreaMaster } from '@/hooks/useAreaMasters';

interface AreaMastersDisplayProps {
  title?: string;
  showDeliveryInfo?: boolean;
  showDairyOnly?: boolean;
}

const AreaMastersDisplay: React.FC<AreaMastersDisplayProps> = ({ 
  showDeliveryInfo = true,
  showDairyOnly = false
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const { data: areaMasters = [], isLoading, isError } = useAreaMasters();
  
  // Filter area masters based on search and dairy filter
  const filteredAreaMasters = useMemo(() => {
    const areaList = Array.isArray(areaMasters) ? areaMasters : [];
    let filtered: AreaMaster[] = areaList;
    
    // Only show Hand Delivery areas (filter out Courier)
    filtered = filtered.filter((am): am is AreaMaster => 
      am && am.deliveryType === 'HandDelivery'
    );
    
    // Filter by dairy products if needed
    if (showDairyOnly) {
      filtered = filtered.filter((am): am is AreaMaster => 
        am && am.isDairyProduct
      );
    }
    
    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter((areaMaster): areaMaster is AreaMaster =>
        areaMaster && (
          areaMaster.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          areaMaster.pincodes.includes(searchTerm) ||
          Boolean(areaMaster.depot?.name?.toLowerCase().includes(searchTerm.toLowerCase()))
        )
      );
    }
    
    return filtered;
  }, [areaMasters, searchTerm, showDairyOnly]);

  // Since we're only showing Hand Delivery areas, no need to group
  const handDeliveryAreas = filteredAreaMasters;


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

  if (Array.isArray(areaMasters) && areaMasters.length === 0) {
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
                {/* <Badge variant="secondary" className="bg-green-100 text-green-700">
                  <Package className="h-3 w-3 mr-1" />
                  {areaList.filter(am => am.isDairyProduct).length} Dairy Areas
                </Badge> */}
                {/* <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                  <Truck className="h-3 w-3 mr-1" />
                  {areaList.filter(am => am.deliveryType === 'HandDelivery').length} Hand Delivery Areas
                </Badge> */}
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
          placeholder="Search by area name, pincode..."
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
            <h3 className="text-lg font-semibold text-gray-900">Home Delivery Areas</h3>
            <Badge variant="secondary" className="bg-green-100 text-green-700">
              {handDeliveryAreas.length} areas
            </Badge>
          </div>
          
          <div className="grid gap-2 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {handDeliveryAreas.map((areaMaster) => (
              <div 
                key={areaMaster.id} 
                className="flex items-center gap-2 p-2 rounded-lg border border-green-100 bg-green-50/50 hover:bg-green-50 transition-colors"
              >
                <MapPin className="h-3 w-3 text-green-600 flex-shrink-0" />
                <span className="text-sm font-medium text-gray-700 truncate">
                  {areaMaster.name}
                </span>
              </div>
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