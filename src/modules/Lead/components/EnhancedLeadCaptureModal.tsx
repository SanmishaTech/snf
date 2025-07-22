import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MapPin, CheckCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { INDIAN_STATES } from '@/config/states';
import { createLead, type CreateLeadData } from '@/services/leadService';

interface PrefilledAddressData {
  recipientName?: string;
  mobile?: string;
  plotBuilding?: string;
  streetArea?: string;
  landmark?: string;
  pincode?: string;
  city?: string;
  state?: string;
}

interface EnhancedLeadCaptureModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  productId?: number;
  productName?: string;
  isDairyProduct?: boolean;
  message?: string;
  prefilledData?: PrefilledAddressData;
  onSuccess?: () => void;
}

export const EnhancedLeadCaptureModal: React.FC<EnhancedLeadCaptureModalProps> = ({
  isOpen,
  onOpenChange,
  productId,
  productName,
  isDairyProduct = false,
  message,
  prefilledData = {},
  onSuccess
}) => {
  const [formData, setFormData] = useState<CreateLeadData>({
    name: prefilledData.recipientName || '',
    mobile: prefilledData.mobile || '',
    email: '',
    plotBuilding: prefilledData.plotBuilding || '',
    streetArea: prefilledData.streetArea || '',
    landmark: prefilledData.landmark || '',
    pincode: prefilledData.pincode || '',
    city: prefilledData.city || 'Dombivli',
    state: prefilledData.state || 'Maharashtra',
    productId,
    isDairyProduct,
    notes: `Service request for ${productName || 'product'} in ${prefilledData.pincode || 'unspecified area'}`
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // Update form data when prefilledData changes
  useEffect(() => {
    setFormData({
      name: prefilledData.recipientName || '',
      mobile: prefilledData.mobile || '',
      email: '',
      plotBuilding: prefilledData.plotBuilding || '',
      streetArea: prefilledData.streetArea || '',
      landmark: prefilledData.landmark || '',
      pincode: prefilledData.pincode || '',
      city: prefilledData.city || 'Dombivli',
      state: prefilledData.state || 'Maharashtra',
      productId,
      isDairyProduct,
      notes: `Service request for ${productName || 'product'} in ${prefilledData.pincode || 'unspecified area'}`
    });
  }, [prefilledData, productId, productName, isDairyProduct]);

  const handleInputChange = (field: keyof CreateLeadData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.name.trim()) newErrors.name = 'Name is required';
    if (!formData.mobile.trim()) newErrors.mobile = 'Mobile is required';
    else if (!/^\d{10}$/.test(formData.mobile.trim())) newErrors.mobile = 'Mobile must be 10 digits';
    if (!formData.plotBuilding.trim()) newErrors.plotBuilding = 'Plot/Building is required';
    if (!formData.streetArea.trim()) newErrors.streetArea = 'Street/Area is required';
    if (!formData.pincode.trim()) newErrors.pincode = 'Pincode is required';
    else if (!/^\d{6}$/.test(formData.pincode.trim())) newErrors.pincode = 'Pincode must be 6 digits';
    if (!formData.city.trim()) newErrors.city = 'City is required';
    if (!formData.state.trim()) newErrors.state = 'State is required';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setIsSubmitting(true);
    
    try {
      await createLead(formData);
      setIsSuccess(true);
      toast.success('Thank you! We\'ll notify you when service is available in your area.');
      
      // Call success callback after a short delay to show success state
      setTimeout(() => {
        onSuccess?.();
        onOpenChange(false);
      }, 2000);
      
    } catch (error: any) {
      console.error('Failed to submit lead:', error);
      toast.error('Failed to submit request. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  // Success state display
  if (isSuccess) {
    return (
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent className="w-full max-w-lg mx-auto p-6">
          <div className="text-center space-y-4">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Request Submitted Successfully!
              </h3>
              <p className="text-sm text-gray-600">
                Thank you for your interest! We've saved your details and will contact you as soon as we start serving your area.
              </p>
              {productName && (
                <p className="text-sm text-blue-600 mt-2">
                  We'll prioritize <strong>{productName}</strong> availability in your region.
                </p>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-2xl mx-auto p-0 max-h-[90vh] overflow-hidden">
        <DialogHeader className="px-6 py-4 border-b bg-gradient-to-r from-blue-50 to-green-50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-full">
              <MapPin className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <DialogTitle className="text-lg font-semibold text-gray-900">
                Request Service in Your Area
              </DialogTitle>
              <DialogDescription className="text-sm text-gray-600 mt-1">
                {message || 'Help us prioritize expanding our delivery network to your location'}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
          {/* Product Information */}
          {productName && (
            <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-blue-900">Product of Interest:</span>
                <span className="text-sm text-blue-700">{productName}</span>
                {isDairyProduct && (
                  <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full">
                    Dairy Product
                  </span>
                )}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Name */}
            <div>
              <Label htmlFor="name" className="text-sm font-medium mb-1 block">
                Full Name *
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="Your full name"
                className={errors.name ? 'border-red-500' : ''}
              />
              {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
            </div>

            {/* Mobile */}
            <div>
              <Label htmlFor="mobile" className="text-sm font-medium mb-1 block">
                Mobile Number *
              </Label>
              <Input
                id="mobile"
                type="tel"
                value={formData.mobile}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '').slice(0, 10);
                  handleInputChange('mobile', value);
                }}
                placeholder="10-digit mobile number"
                maxLength={10}
                className={errors.mobile ? 'border-red-500' : ''}
              />
              {errors.mobile && <p className="text-red-500 text-xs mt-1">{errors.mobile}</p>}
            </div>
          </div>

          {/* Email (Optional) */}
          <div>
            <Label htmlFor="email" className="text-sm font-medium mb-1 block">
              Email Address (Optional)
            </Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              placeholder="your.email@example.com"
            />
          </div>

          {/* Address Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="plotBuilding" className="text-sm font-medium mb-1 block">
                Plot/Building *
              </Label>
              <Input
                id="plotBuilding"
                value={formData.plotBuilding}
                onChange={(e) => handleInputChange('plotBuilding', e.target.value)}
                placeholder="Plot number, building name"
                className={errors.plotBuilding ? 'border-red-500' : ''}
              />
              {errors.plotBuilding && <p className="text-red-500 text-xs mt-1">{errors.plotBuilding}</p>}
            </div>

            <div>
              <Label htmlFor="streetArea" className="text-sm font-medium mb-1 block">
                Street/Area *
              </Label>
              <Input
                id="streetArea"
                value={formData.streetArea}
                onChange={(e) => handleInputChange('streetArea', e.target.value)}
                placeholder="Street name, area"
                className={errors.streetArea ? 'border-red-500' : ''}
              />
              {errors.streetArea && <p className="text-red-500 text-xs mt-1">{errors.streetArea}</p>}
            </div>
          </div>

          <div>
            <Label htmlFor="landmark" className="text-sm font-medium mb-1 block">
              Landmark (Optional)
            </Label>
            <Input
              id="landmark"
              value={formData.landmark}
              onChange={(e) => handleInputChange('landmark', e.target.value)}
              placeholder="Nearby landmark"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="pincode" className="text-sm font-medium mb-1 block">
                Pincode *
              </Label>
              <Input
                id="pincode"
                value={formData.pincode}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                  handleInputChange('pincode', value);
                }}
                placeholder="6-digit pincode"
                maxLength={6}
                className={errors.pincode ? 'border-red-500' : ''}
              />
              {errors.pincode && <p className="text-red-500 text-xs mt-1">{errors.pincode}</p>}
            </div>

            <div>
              <Label htmlFor="city" className="text-sm font-medium mb-1 block">
                City *
              </Label>
              <Input
                id="city"
                value={formData.city}
                onChange={(e) => handleInputChange('city', e.target.value)}
                placeholder="Your city"
                className={errors.city ? 'border-red-500' : ''}
              />
              {errors.city && <p className="text-red-500 text-xs mt-1">{errors.city}</p>}
            </div>

            <div>
              <Label htmlFor="state" className="text-sm font-medium mb-1 block">
                State *
              </Label>
              <Select
                value={formData.state}
                onValueChange={(value) => handleInputChange('state', value)}
              >
                <SelectTrigger className={errors.state ? 'border-red-500' : ''}>
                  <SelectValue placeholder="Select state" />
                </SelectTrigger>
                <SelectContent className="max-h-60 overflow-y-auto">
                  {INDIAN_STATES.map((state) => (
                    <SelectItem key={state.value} value={state.label}>
                      {state.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.state && <p className="text-red-500 text-xs mt-1">{errors.state}</p>}
            </div>
          </div>

          {/* Info Section */}
          <div className="bg-green-50 p-3 rounded-lg border border-green-200">
            <p className="text-sm text-green-700">
              <strong>What happens next?</strong> We'll review your request and contact you as soon as we expand our delivery services to your area. You'll be among the first customers we serve!
            </p>
          </div>
        </form>

        <DialogFooter className="p-6 border-t bg-gray-50">
          <div className="flex gap-3 w-full">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={isSubmitting}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="flex-1 bg-blue-600 hover:bg-blue-700"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                'Submit Request'
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};