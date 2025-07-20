import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { AlertTriangle, MapPin } from 'lucide-react';
import { LeadForm } from './LeadForm';

interface LeadCaptureDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  productId?: number;
  productName?: string;
  isDairyProduct?: boolean;
  pincode?: string;
  message?: string;
}

export const LeadCaptureDialog: React.FC<LeadCaptureDialogProps> = ({
  isOpen,
  onOpenChange,
  productId,
  productName,
  isDairyProduct = false,
  pincode,
  message,
}) => {
  const handleSuccess = () => {
    onOpenChange(false);
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-2xl mx-auto p-0 max-h-[90vh] overflow-hidden">
        <DialogHeader className="px-6 py-4 border-b bg-gradient-to-r from-orange-50 to-red-50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 rounded-full">
              <AlertTriangle className="h-5 w-5 text-orange-600" />
            </div>
            <div>
              <DialogTitle className="text-lg font-semibold text-gray-900">
                Service Not Available in Your Area
              </DialogTitle>
              <DialogDescription className="text-sm text-gray-600 mt-1">
                {message || 'We don\'t currently serve your location, but we\'d love to help!'}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="px-6 py-4 space-y-4 overflow-y-auto">
          {/* Information Section */}
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <div className="flex items-start gap-3">
              <MapPin className="h-5 w-5 text-blue-600 mt-0.5" />
              <div>
                <h3 className="font-medium text-blue-900">Help Us Expand to Your Area</h3>
                <p className="text-sm text-blue-700 mt-1">
                  We're constantly expanding our delivery network. By sharing your details, 
                  you'll be among the first to know when we start serving your area.
                </p>
                {productName && (
                  <p className="text-sm text-blue-700 mt-2">
                    <strong>Product of Interest:</strong> {productName}
                    {isDairyProduct && ' (Dairy Product)'}
                  </p>
                )}
                {pincode && (
                  <p className="text-sm text-blue-700">
                    <strong>Your Area:</strong> {pincode}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Lead Form */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Share Your Details
            </h3>
            <LeadForm
              productId={productId}
              isDairyProduct={isDairyProduct}
              initialData={{
                pincode: pincode || '',
              }}
              onSuccess={handleSuccess}
              onCancel={handleCancel}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};