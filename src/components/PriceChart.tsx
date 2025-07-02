import React, { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/dialog';
import { TrendingDown, Clock, Calendar, Zap, X, IndianRupee } from 'lucide-react';

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

interface ProductVariant {
  id: string;
  name: string;
  price: number;
  rate: number;
  price3Day?: number;
  price15Day?: number;
  price1Month?: number;
  buyOncePrice?: number;
  unit?: string;
}

interface PriceChartProps {
  product?: ProductData;
  variants?: ProductVariant[];
  className?: string;
  deliveryPreference?: 'home' | 'pickup';
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

export const PriceChart: React.FC<PriceChartProps> = ({ product, variants, className, deliveryPreference = 'home' }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Pricing matrix based on your requirements
  const pricingMatrix = {
    home: { // Website/Online pricing
      buyOnce: { price: 55, savings: 0 },
      subscription: {
        3: { price: 47, savings: 15 }, // (55-47)/55 * 100 ≈ 15%
        15: { price: 46, savings: 16 }, // (55-46)/55 * 100 ≈ 16%
        30: { price: 43, savings: 22 }  // (55-43)/55 * 100 ≈ 22%
      }
    },
    pickup: { // Store Pickup pricing
      buyOnce: { price: 50, savings: 9 }, // 9% savings vs online buy once
      subscription: {
        3: { price: 45, savings: 18 },  // vs online buy once
        15: { price: 44, savings: 20 }, // vs online buy once
        30: { price: 41, savings: 25 }  // vs online buy once
      }
    }
  };

  // Helper function to get price for a specific period and delivery preference
  const getPriceForPeriod = (period: number | 'buyOnce', deliveryPref: 'home' | 'pickup' = deliveryPreference): number => {
    if (period === 'buyOnce') {
      return pricingMatrix[deliveryPref].buyOnce.price;
    }
    return pricingMatrix[deliveryPref].subscription[period as 3 | 15 | 30]?.price || 0;
  };

  // Calculate savings percentage vs online buy once price
  const calculateSavings = (period: number | 'buyOnce', deliveryPref: 'home' | 'pickup' = deliveryPreference): number => {
    if (period === 'buyOnce') {
      return pricingMatrix[deliveryPref].buyOnce.savings;
    }
    return pricingMatrix[deliveryPref].subscription[period as 3 | 15 | 30]?.savings || 0;
  };

  // Get available schedules for a specific period
  const getAvailableSchedules = (period: number) => {
    const allSchedules = [
      { 
        id: "daily", 
        label: "Daily", 
        description: "Fresh delivery every single day", 
        tooltip: "Get your product delivered every day without any gaps. Perfect for regular consumption.",
        minPeriod: 3 
      },
      { 
        id: "alternate-days", 
        label: "Alternate Days", 
        description: "Every other day delivery", 
        tooltip: "Delivery every alternate day (Day 1, Day 3, Day 5, etc.). Good for moderate consumption patterns.",
        minPeriod: 15 
      },
      { 
        id: "day1-day2", 
        label: "Day 1-Day 2", 
        description: "Varying quantities", 
        tooltip: "Different quantities on different days. For example: 2 units on Day 1, 1 unit on Day 2, then repeat.",
        minPeriod: 15 
      },
      { 
        id: "select-days", 
        label: "Weekdays", 
        description: "Custom days selection", 
        tooltip: "Choose specific days of the week for delivery (e.g., Monday, Wednesday, Friday). Maximum flexibility.",
        minPeriod: 30 
      },
    ];
    
    return allSchedules.filter(schedule => period >= schedule.minPeriod);
  };

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
  }, [deliveryPreference]);

  if (!product && (!variants || variants.length === 0)) {
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
              <p className="text-sm text-gray-600">
                Choose the best subscription plan for your needs. Longer periods offer better savings!
              </p>
            </div>

            {/* Pricing Comparison - Side by Side */}
            <div className="space-y-6">
              <h4 className="font-semibold text-gray-900 text-lg">Pricing Comparison: Website vs Store Pickup</h4>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Website Pricing */}
                <div className="border-2 border-blue-200 rounded-lg overflow-hidden">
                  <div className="bg-blue-50 px-4 py-3 border-b border-blue-200">
                    <h5 className="font-semibold text-blue-900 flex items-center gap-2">
                      <TrendingDown className="h-4 w-4" />
                      Website (Online Delivery)
                    </h5>
                  </div>
                  <div className="p-4">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="text-left py-2 text-sm font-medium text-gray-700">Period</th>
                          <th className="text-right py-2 text-sm font-medium text-gray-700">Price</th>
                          <th className="text-right py-2 text-sm font-medium text-gray-700">Savings</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        <tr>
                          <td className="py-3">
                            <div className="flex items-center gap-2">
                              <div className="text-gray-600">Buy Once</div>
                            </div>
                          </td>
                          <td className="text-right py-3 font-semibold text-gray-900">
                            ₹{getPriceForPeriod('buyOnce', 'home')}
                          </td>
                          <td className="text-right py-3 text-gray-500 text-sm">
                            Base Price
                          </td>
                        </tr>
                        {subscriptionPeriods.map(period => (
                          <tr key={period.value}>
                            <td className="py-3">
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
                            <td className="text-right py-3 font-semibold text-green-600">
                              ₹{getPriceForPeriod(period.value, 'home')}
                            </td>
                            <td className="text-right py-3">
                              <Badge className="bg-orange-100 text-orange-800 text-xs">
                                {calculateSavings(period.value, 'home')}% off
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Store Pickup Pricing */}
                <div className="border-2 border-green-200 rounded-lg overflow-hidden">
                  <div className="bg-green-50 px-4 py-3 border-b border-green-200">
                    <h5 className="font-semibold text-green-900 flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Store Pickup
                    </h5>
                  </div>
                  <div className="p-4">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="text-left py-2 text-sm font-medium text-gray-700">Period</th>
                          <th className="text-right py-2 text-sm font-medium text-gray-700">Price</th>
                          <th className="text-right py-2 text-sm font-medium text-gray-700">Savings</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        <tr>
                          <td className="py-3">
                            <div className="flex items-center gap-2">
                              <div className="text-gray-600">Buy Once</div>
                            </div>
                          </td>
                          <td className="text-right py-3 font-semibold text-gray-900">
                            ₹{getPriceForPeriod('buyOnce', 'pickup')}
                          </td>
                          <td className="text-right py-3">
                            <Badge className="bg-green-100 text-green-800 text-xs">
                              {calculateSavings('buyOnce', 'pickup')}% off vs online
                            </Badge>
                          </td>
                        </tr>
                        {subscriptionPeriods.map(period => (
                          <tr key={period.value}>
                            <td className="py-3">
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
                            <td className="text-right py-3 font-semibold text-green-600">
                              ₹{getPriceForPeriod(period.value, 'pickup')}
                            </td>
                            <td className="text-right py-3">
                              <Badge className="bg-green-100 text-green-800 text-xs">
                                {calculateSavings(period.value, 'pickup')}% off vs online
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
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

            {/* Variants Information */}
            {variants && variants.length > 1 && (
              <div className="space-y-4">
                <h4 className="font-semibold text-gray-900 text-lg">Available Product Variants</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {variants.slice(0, 6).map((variant) => (
                    <div 
                      key={variant.id}
                      className="flex justify-between items-center p-3 border rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
                    >
                      <span className="text-sm font-medium text-gray-900">{variant.name}</span>
                      <Badge variant="outline" className="bg-white">
                        ₹{variant.rate} per {variant.unit || 'unit'}
                      </Badge>
                    </div>
                  ))}
                  {variants.length > 6 && (
                    <div className="text-center text-sm text-gray-500 p-3 border rounded-lg bg-gray-50">
                      +{variants.length - 6} more variants
                    </div>
                  )}
                </div>
              </div>
            )}

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
