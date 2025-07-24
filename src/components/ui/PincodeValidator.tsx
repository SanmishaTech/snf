import React from 'react';
import { Check, AlertTriangle, Info, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PincodeValidatorProps {
  pincode: string;
  isValid: boolean;
  message: string;
  isValidating?: boolean;
  showServiceRequest?: boolean;
  onRequestService?: () => void;
}

export const PincodeValidator: React.FC<PincodeValidatorProps> = ({
  pincode,
  isValid,
  message,
  isValidating = false,
  showServiceRequest = false,
  onRequestService
}) => {
  if (isValidating) {
    return (
      <div className="flex items-center gap-2 mt-2 p-2 bg-blue-50 border border-blue-200 rounded-md">
        <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
        <p className="text-sm text-blue-700">Validating pincode...</p>
      </div>
    );
  }

  if (!pincode || pincode.length < 6) {
    return (
      <div className="flex items-center gap-2 mt-2 p-2 bg-gray-50 border border-gray-200 rounded-md">
        <Info className="h-4 w-4 text-gray-500" />
        <p className="text-sm text-gray-600">Enter your 6-digit pincode to check delivery availability</p>
      </div>
    );
  }

  if (isValid) {
    return (
      <div className="flex items-center gap-2 mt-2 p-2 bg-green-50 border border-green-200 rounded-md">
        <Check className="h-4 w-4 text-green-600" />
        <p className="text-sm text-green-700">{message}</p>
      </div>
    );
  }

  return (
    <div className="mt-2 p-3 bg-orange-50 border border-orange-200 rounded-md">
      <div className="flex items-center gap-2 mb-2">
        <AlertTriangle className="h-4 w-4 text-orange-600" />
        <p className="text-sm text-orange-700">{message}</p>
      </div>
      {showServiceRequest && onRequestService && (
        <Button
          type="button"
          variant="outline" 
          size="sm"
          onClick={onRequestService}
          className="mt-2 text-white bg-secondary border-secondary hover:bg-secondary"
        >
          <MapPin className="h-4 w-4 mr-2" />
          Click Here to Request Service in Your Area
        </Button>
      )}
    </div>
  );
};