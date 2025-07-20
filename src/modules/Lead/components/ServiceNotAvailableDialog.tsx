import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CheckCircle, MapPin, Heart } from 'lucide-react';

interface ServiceNotAvailableDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  productName?: string;
  areaName?: string;
  message?: string;
}

export const ServiceNotAvailableDialog: React.FC<ServiceNotAvailableDialogProps> = ({
  isOpen,
  onOpenChange,
  productName,
  areaName,
  message,
}) => {
  const handleClose = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-md mx-auto p-0 max-h-[90vh] overflow-hidden">
        <DialogHeader className="px-6 py-6 text-center bg-gradient-to-r from-green-50 to-blue-50">
          <div className="flex items-center justify-center mb-4">
            <div className="p-3 bg-green-100 rounded-full">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </div>
          <DialogTitle className="text-xl font-semibold text-gray-900 mb-2">
            Thank You for Your Interest!
          </DialogTitle>
          <DialogDescription className="text-gray-600 leading-relaxed">
            {message || `We're excited about your interest in ${productName || 'our dairy products'}${areaName ? ` for ${areaName}` : ''}!`}
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 py-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <div className="flex items-start gap-3">
              <MapPin className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="font-medium text-blue-900 mb-1">We've noted your location</h4>
                <p className="text-sm text-blue-700">
                  Your details have been saved and we're working hard to expand our dairy delivery services to your area.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Heart className="h-5 w-5 text-orange-600 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="font-medium text-orange-900 mb-1">We'll reach out to you shortly</h4>
                <p className="text-sm text-orange-700">
                  Our team will contact you as soon as we begin serving your area. Thank you for your patience!
                </p>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="px-6 py-4 bg-gray-50">
          <Button 
            onClick={handleClose}
            className="w-full bg-primary hover:bg-primary/90 text-white"
          >
            Got it, Thank You!
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};