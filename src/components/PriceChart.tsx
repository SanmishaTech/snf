import React, { useState, useEffect, useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/dialog';
import { TrendingDown, Clock, Calendar, Zap, X, IndianRupee } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { get } from '@/services/apiService';
import { useQuery } from '@tanstack/react-query';

interface ProductData {
  id: number;
  name: string;
  price: number;
  rate: number;
  unit?: string;
  price3Day?: number;
  price15Day?: number;
  price1Month?: number;
  buyOncePrice?: number;
}

interface DepotVariant {
  id: string;
  name: string;
  price: number;
  rate: number;
  mrp?: number; // Maximum Retail Price for savings calculation
  price3Day?: number;
  price7Day?: number;
  price15Day?: number;
  price1Month?: number;
  buyOncePrice?: number;
  unit: string;
  depot: {
    id: number;
    name: string;
    isOnline: boolean;
    address: string;
  };
  product: {
    id: number;
    name: string;
    unit?: string;
  };
  isAvailable: boolean;
  minimumQty?: number;
}

interface PriceChartProps {
  product?: ProductData;
  variants?: DepotVariant[];
  className?: string;
  deliveryPreference?: 'home' | 'pickup';
  selectedDepotId?: number | null;
}

const subscriptionPeriods = [
  { 
    value: 3, 
    label: "3 Days", 
    description: "Trial Pack",
    color: "#3B82F6",
    icon: <Zap className="h-4 w-4" />
  },
  { 
    value: 15, 
    label: "15 Days", 
    description: "Mid Saver Pack",
    color: "#10B981",
    icon: <Clock className="h-4 w-4" />
  },
  { 
    value: 30, 
    label: "30 Days", 
    description: "Super Saver Pack",
    color: "#8B5CF6",
    icon: <Calendar className="h-4 w-4" />
  },
] as const;

const deliverySchedules = [
  { id: "daily", label: "Daily", description: "Every day delivery" },
  { id: "alternate-days", label: "Alternate Days", description: "Every other day (15+ days only)" },
  { id: "day1-day2", label: "Day 1-Day 2", description: "Varying quantities (15+ days only)" },
  { id: "select-days", label: "Weekdays", description: "Custom days selection (30 days only)" },
];

export const PriceChart: React.FC<PriceChartProps> = ({ product, variants, className, deliveryPreference = 'home', selectedDepotId }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Fetch depot variants for the current product
  const fetchDepotVariants = async (): Promise<DepotVariant[]> => {
    if (!product?.id) return [];
    const response = await get(`/api/public/depot-variants/${product.id}`);
    return response.data || [];
  };

  const { data: depotVariants = [], isLoading: variantsLoading } = useQuery<DepotVariant[]>({
    queryKey: ['depot-variants', product?.id],
    queryFn: fetchDepotVariants,
    enabled: !!product?.id,
  });

  // Get variants filtered by delivery preference and unit
  const getVariantsByType = (deliveryPref: 'home' | 'pickup', unit: '500ml' | '1L', forComparison: boolean = false): DepotVariant[] => {
    return depotVariants.filter(variant => {
      const isCorrectDelivery = deliveryPref === 'home' ? variant.depot.isOnline : !variant.depot.isOnline;
      
      // Enhanced unit matching to handle different formats
      let isCorrectUnit = false;
      if (unit === '500ml') {
        isCorrectUnit = variant.unit === '500ml' || variant.name.includes('500ml') || variant.name.includes('500 ml');
      } else if (unit === '1L') {
        isCorrectUnit = variant.unit === '1L' || 
                       variant.name.includes('1L') || 
                       variant.name.includes('1 L') || 
                       variant.name.includes('1 Ltrs') || 
                       variant.name.includes('1 Ltr') || 
                       variant.name.includes('1000ml') ||
                       variant.name.includes('1000 ml');
      }
      
      // Depot filtering logic:
      // - For comparison: don't filter by depot
      // - For home delivery: show variants from any online depot (ignore selectedDepotId)
      // - For pickup delivery: filter by selectedDepotId if specified
      let isCorrectDepot = true;
      if (forComparison) {
        isCorrectDepot = true; // No depot filtering for comparison
      } else if (deliveryPref === 'home') {
        isCorrectDepot = true; // Show all online depot variants for home delivery
      } else if (deliveryPref === 'pickup') {
        isCorrectDepot = !selectedDepotId || variant.depot.id === selectedDepotId;
      }
      
      return isCorrectDelivery && isCorrectUnit && isCorrectDepot;
    });
  };

  // Debug function to check available variants
  const getAvailableVariants = () => {
    const online500ml = getVariantsByType('home', '500ml');
    const online1L = getVariantsByType('home', '1L');
    const pickup500ml = getVariantsByType('pickup', '500ml');
    const pickup1L = getVariantsByType('pickup', '1L');
    
    console.log('Available variants:', {
      online500ml: online500ml.map(v => ({ name: v.name, unit: v.unit, depot: v.depot.name })),
      online1L: online1L.map(v => ({ name: v.name, unit: v.unit, depot: v.depot.name })),
      pickup500ml: pickup500ml.map(v => ({ name: v.name, unit: v.unit, depot: v.depot.name })),
      pickup1L: pickup1L.map(v => ({ name: v.name, unit: v.unit, depot: v.depot.name })),
    });
    
    return { online500ml, online1L, pickup500ml, pickup1L };
  };

  // Helper function to get price for a specific period, delivery preference, and variant
  const getPriceForPeriod = (period: number | 'buyOnce' | 'mrp', deliveryPref: 'home' | 'pickup' = deliveryPreference, unit: '500ml' | '1L' = '500ml', forComparison: boolean = false): number => {
    const variants = getVariantsByType(deliveryPref, unit, forComparison);
    if (variants.length === 0) return 0;
    
    const variant = variants[0]; // Take first matching variant

    if (period === 'mrp') {
      // Use mrp field if available, otherwise fallback to price field
      return variant.mrp || variant.price || 0;
    }
    
    if (period === 'buyOnce') {
      return variant.buyOncePrice || 0;
    }
    
    switch (period) {
      case 3:
        return variant.price3Day || 0;
      case 15:
        return variant.price15Day || 0;
      case 30:
        return variant.price1Month || 0;
      default:
        return 0;
    }
  };

  // Calculate savings percentage vs mrp
  const calculateSavings = (period: number | 'buyOnce', deliveryPref: 'home' | 'pickup' = deliveryPreference, unit: '500ml' | '1L' = '500ml', forComparison: boolean = false): number => {
    const mrp = getPriceForPeriod('mrp', deliveryPref, unit, forComparison);
    const subscriptionPrice = getPriceForPeriod(period, deliveryPref, unit, forComparison);
    
    if (mrp === 0 || subscriptionPrice === 0) return 0;
    
    // Calculate savings vs MRP for all periods including buyOnce
    const savings = Math.round(((mrp - subscriptionPrice) / mrp) * 100);
    return Math.max(0, savings); // Ensure no negative savings
  };

  // Calculate absolute savings amount
  const calculateSavingsAmount = (period: number | 'buyOnce', deliveryPref: 'home' | 'pickup' = deliveryPreference, unit: '500ml' | '1L' = '500ml', forComparison: boolean = false): number => {
    const mrp = getPriceForPeriod('mrp', deliveryPref, unit, forComparison);
    const subscriptionPrice = getPriceForPeriod(period, deliveryPref, unit, forComparison);
    
    if (mrp === 0 || subscriptionPrice === 0) return 0;
    
    return Math.max(0, mrp - subscriptionPrice);
  };

  // Get depot name for selected depot
  const getSelectedDepotName = (): string => {
    if (!selectedDepotId) return '';
    const depot = depotVariants.find(variant => variant.depot.id === selectedDepotId)?.depot;
    return depot ? depot.name : '';
  };

  // Get available schedules for a specific period
  const getAvailableSchedules = (period: number) => {
    const allSchedules = [
      { 
        id: "daily", 
        label: "Daily", 
        description: "Fresh delivery every single day", 
        tooltip: "Receive your order every day, so you never run out.", 
      minPeriod: 3 
      },
      { 
        id: "alternate-days", 
        label: "Alternate Days", 
        description: "Every other day delivery", 
        tooltip: "Get your order every other day (Day 1, Day 3, Day 5…). Great if you use it regularly but not daily.", 
        minPeriod: 15 
      },
      { 
        id: "day1-day2", 
        label: "Day 1–Day 2", 
        description: "Varying quantities", 
        tooltip: "On Day 1 you’ll get one quantity, on Day 2 a different quantity, then it repeats. Ideal for changing needs.", 
        minPeriod: 15 
      },
      { 
        id: "select-days", 
        label: "Weekdays", 
        description: "Custom days selection", 
        tooltip: "Pick the exact weekdays you want deliveries (e.g., Monday, Wednesday, Friday). Total flexibility.", 
        minPeriod: 30 
      },
    ];
    
    
    return allSchedules.filter(schedule => period >= schedule.minPeriod);
  };

  // Debug variants when data changes
  React.useEffect(() => {
    if (depotVariants.length > 0) {
      getAvailableVariants();
    }
  }, [depotVariants, selectedDepotId]);

  // Prepare pricing data
  const pricingData = React.useMemo(() => {
    return subscriptionPeriods.map(period => ({
      period: period.label,
      periodValue: period.value,
      price: getPriceForPeriod(period.value, deliveryPreference),
      buyOncePrice: getPriceForPeriod('buyOnce', deliveryPreference),
      savings: calculateSavings(period.value, deliveryPreference),
      color: period.color,
      description: period.description,
      icon: period.icon,
      availableSchedules: getAvailableSchedules(period.value)
    }));
  }, [deliveryPreference, depotVariants, selectedDepotId]);

  if (variantsLoading) {
    return (
      <Button 
        variant="outline" 
        disabled
        className="w-full py-3 text-sm border-blue-500 text-blue-600 hover:bg-blue-50 flex items-center justify-center gap-2"
      >
        <Skeleton className="h-4 w-4 rounded-full" />
        Loading Pricing...
      </Button>
    );
  }

  if (!product && (!variants || variants.length === 0) && depotVariants.length === 0) {
    return null;
  }

  const unit = product?.unit || variants?.[0]?.unit || 'unit';

  return (
    <>
      {/* Button to open pricing modal */}
      <Button 
        variant="outline" 
        onClick={() => setIsModalOpen(true)}
        className="w-full py-3 text-sm border-blue-500 text-blue-600 hover:bg-blue-50 flex items-center justify-center gap-2"
      >
        <IndianRupee className="h-4 w-4" />
        View Subscription Pricing & Schedules
      </Button>

      {/* Pricing Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-4xl max-h-[85vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <TrendingDown className="h-5 w-5 text-blue-600" />
              Subscription Pricing & Schedules
            </DialogTitle>
            <DialogClose className="absolute right-4 top-4">
              <X className="h-4 w-4" />
            </DialogClose>
          </DialogHeader>
          
          <div className="overflow-y-auto max-h-[70vh] space-y-6 pr-2">
            {/* Product Info */}
            <div className="bg-blue-50/50 p-4 rounded-lg border">
              <h3 className="font-semibold text-gray-900 mb-2">{product?.name || "Product"}</h3>
              <div className="space-y-2">
                <p className="text-sm text-gray-600">
                  Choose the best subscription plan for your needs. Longer periods offer better savings!
                </p>
                {deliveryPreference === 'pickup' && selectedDepotId && getSelectedDepotName() && (
                  <div className="bg-green-100 p-2 rounded-md">
                    <p className="text-sm text-green-800 font-medium">
                      📍 Showing prices for: {getSelectedDepotName()}
                    </p>
                  </div>
                )}
                {deliveryPreference === 'home' && (
                  <div className="bg-blue-100 p-2 rounded-md">
                    <p className="text-sm text-blue-800 font-medium">
                      🚚 Showing online delivery prices
                    </p>
                  </div>
                )}
              </div>
            </div>

         

            {/* Pricing Comparison - New 2-Column Layout */}
            <div className="space-y-6">
              <h4 className="font-semibold text-gray-900 text-lg">Subscription Pricing for {deliveryPreference === 'home' ? 'Online Delivery' : 'Store Pickup'}</h4>
              
              {/* Horizontal 2-Column Layout */}
              <div className="overflow-x-auto">
                <table className="w-full border border-gray-200 rounded-lg">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 border-r border-gray-200">Period</th>
                      <th className="text-center py-3 px-4 text-sm font-medium text-gray-700 border-r border-gray-200" colSpan={2}>
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                          500ml
                        </div>
                      </th>
                      <th className="text-center py-3 px-4 text-sm font-medium text-gray-700" colSpan={2}>
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                          1L
                        </div>
                      </th>
                    </tr>
                    <tr className="bg-gray-50 border-t border-gray-200">
                      <th className="py-2 px-4 border-r border-gray-200"></th>
                      <th className="text-center py-2 px-3 text-xs font-medium text-gray-600 border-r border-gray-100">Price</th>
                      <th className="text-center py-2 px-3 text-xs font-medium text-gray-600 border-r border-gray-200">Savings</th>
                      <th className="text-center py-2 px-3 text-xs font-medium text-gray-600 border-r border-gray-100">Price</th>
                      <th className="text-center py-2 px-3 text-xs font-medium text-gray-600">Savings</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {/* Buy Once Row */}
                    <tr className="hover:bg-gray-50">
                      <td className="py-3 px-4 border-r border-gray-200">
                        <div className="flex items-center gap-2">
                          <div className="text-gray-600 font-medium">Buy Once</div>
                        </div>
                      </td>
                      <td className="text-center py-3 px-3 font-semibold text-gray-900 border-r border-gray-100">
                        ₹{getPriceForPeriod('buyOnce', deliveryPreference, '500ml') || '--'}
                      </td>
                      <td className="text-center py-3 px-3 border-r border-gray-200">
                        <span className="text-xs text-black">Base Price</span>
                      </td>
                      <td className="text-center py-3 px-3 font-semibold text-gray-900 border-r border-gray-100">
                        ₹{getPriceForPeriod('buyOnce', deliveryPreference, '1L') || '--'}
                      </td>
                      <td className="text-center py-3 px-3">
                        <span className="text-xs text-black">Base Price</span>
                      </td>
                    </tr>
                    
                    {/* Subscription Periods */}
                    {subscriptionPeriods.map(period => (
                      <tr key={period.value} className="hover:bg-gray-50">
                        <td className="py-3 px-4 border-r border-gray-200">
                          <div className="flex items-center gap-2">
                            <div style={{ color: period.color }} className="flex items-center">
                              {period.icon}
                            </div>
                            <div>
                              <div className="font-medium text-gray-900 text-sm">{period.label}</div>
                              <div className="text-xs text-gray-500">{period.description}</div>
                            </div>
                          </div>
                        </td>
                        <td className="text-center py-3 px-3 border-r border-gray-100">
                          <span className="font-semibold text-green-600">
                            ₹{getPriceForPeriod(period.value, deliveryPreference, '500ml') || '--'}
                          </span>
                        </td>
                        <td className="text-center py-3 px-3 border-r border-gray-200">
                          {calculateSavings(period.value, deliveryPreference, '500ml') > 0 ? (
                            <div className="flex flex-col items-center">
                              <Badge className="bg-orange-100 text-orange-800 text-xs mb-1">
                                {calculateSavings(period.value, deliveryPreference, '500ml')}% off
                              </Badge>
                              <span className="text-xs text-green-600 font-medium">
                                Save ₹{calculateSavingsAmount(period.value, deliveryPreference, '500ml')}
                              </span>
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400">No savings</span>
                          )}
                        </td>
                        <td className="text-center py-3 px-3 border-r border-gray-100">
                          <span className="font-semibold text-green-600">
                            ₹{getPriceForPeriod(period.value, deliveryPreference, '1L') || '--'}
                          </span>
                        </td>
                        <td className="text-center py-3 px-3">
                          {calculateSavings(period.value, deliveryPreference, '1L') > 0 ? (
                            <div className="flex flex-col items-center">
                              <Badge className="bg-orange-100 text-orange-800 text-xs mb-1">
                                {calculateSavings(period.value, deliveryPreference, '1L')}% off
                              </Badge>
                              <span className="text-xs text-green-600 font-medium">
                                Save ₹{calculateSavingsAmount(period.value, deliveryPreference, '1L')}
                              </span>
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400">No savings</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
 
              {/* Delivery Schedules by Period */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h5 className="font-medium text-gray-900 mb-3">Available Delivery Schedules by Period</h5>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {subscriptionPeriods.map(period => {
                    const availableSchedules = getAvailableSchedules(period.value);
                    return (
                      <div key={period.value} className="bg-white rounded-lg p-3 border">
                        <div className="flex items-center gap-2 mb-2">
                          <div style={{ color: period.color }}>
                            {period.icon}
                          </div>
                          <span className="font-medium text-sm">{period.label}</span>
                        </div>
                        <div className="space-y-1">
                          {availableSchedules.map((schedule) => (
                            <Badge 
                              key={schedule.id} 
                              variant="outline" 
                              className="text-xs bg-blue-50 text-blue-700 border-blue-200 mr-1 mb-1"
                            >
                              {schedule.label}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Detailed Schedule Information */}
            <div className="space-y-4">
              <h4 className="font-semibold text-gray-900 text-lg flex items-center gap-2">
                <Clock className="h-5 w-5 text-blue-600" />
                Delivery Schedule Details
              </h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {getAvailableSchedules(30).map((schedule) => (
                  <div 
                    key={schedule.id}
                    className="border rounded-lg p-4 bg-gradient-to-br from-blue-50/30 to-white hover:shadow-md transition-all duration-200 cursor-help group relative"
                   >
                    <div className="flex items-start gap-3">
                      <div className="w-3 h-3 bg-secondary rounded-full mt-1 flex-shrink-0"></div>
                      <div className="flex-1">
                        <h5 className="font-medium text-gray-900 mb-1 group-hover:text-blue-700 transition-colors">{schedule.label}</h5>
                        <p className="text-sm text-gray-600 mb-2">{schedule.description}</p>
                        <div className="text-xs text-blue-600 font-medium">
                          Available for: {schedule.id === 'daily' ? 'All periods' : 
                                        schedule.id === 'alternate-days' ? '15+ days' :
                                        schedule.id === 'day1-day2' ? '15+ days' : '30 days only'}
                        </div>
                        
                        {/* Tooltip on hover */}
                        <div className="absolute left-4 right-4 top-full mt-2 bg-gray-900 text-white text-xs p-3 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-10 shadow-lg">
                          <div className="absolute -top-1 left-4 w-2 h-2 bg-gray-900 rotate-45"></div>
                          {schedule.tooltip}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

           

            {/* Key Benefits */}
            <div className="space-y-4">
              <h4 className="font-semibold text-gray-900 text-lg">Subscription Benefits</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center gap-3 p-3 border rounded-lg bg-green-50/50">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-sm text-green-700 font-medium">Better pricing than one-time purchases</span>
                </div>
                <div className="flex items-center gap-3 p-3 border rounded-lg bg-green-50/50">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-sm text-green-700 font-medium">Flexible delivery schedules</span>
                </div>
                <div className="flex items-center gap-3 p-3 border rounded-lg bg-green-50/50">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-sm text-green-700 font-medium">Pause or modify anytime</span>
                </div>
                <div className="flex items-center gap-3 p-3 border rounded-lg bg-green-50/50">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-sm text-green-700 font-medium">Fresh delivery guaranteed</span>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default PriceChart;
