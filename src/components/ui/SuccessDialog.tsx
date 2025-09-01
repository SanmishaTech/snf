import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CheckCircle, Package, Calendar, MapPin } from "lucide-react";
import { format } from "date-fns";

interface SuccessDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  title: string;
  message: string;
  orderDetails?: {
    orderId?: string;
    productName?: string;
    quantity?: number;
    deliveryDate?: Date;
    address?: string;
    totalAmount?: number;
  };
  subscriptionDetails?: {
    subscriptionId?: string;
    productName?: string;
    quantity?: number;
    period?: string;
    startDate?: Date;
    address?: string;
    totalAmount?: number;
  };
}

export const SuccessDialog: React.FC<SuccessDialogProps> = ({
  isOpen,
  onOpenChange,
  title,
  message,
  orderDetails,
  subscriptionDetails,
}) => {
  const handleClose = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-md mx-auto p-0 overflow-hidden">
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-6">
          <DialogHeader className="text-center space-y-4">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <DialogTitle className="text-xl font-semibold text-green-800">
              {title}
            </DialogTitle>
            <p className="text-green-700 text-sm">{message}</p>
          </DialogHeader>

          {/* Order Details */}
          {orderDetails && (
            <div className="mt-6 bg-white rounded-lg p-4 space-y-3">
              <h4 className="font-medium text-gray-800 flex items-center gap-2">
                <Package className="w-4 h-4" />
                Order Details
              </h4>
              <div className="space-y-2 text-sm text-gray-600">
                {orderDetails.orderId && (
                  <div className="flex justify-between">
                    <span>Order ID:</span>
                    <span className="font-medium">{orderDetails.orderId}</span>
                  </div>
                )}
                {orderDetails.productName && (
                  <div className="flex justify-between">
                    <span>Product:</span>
                    <span className="font-medium">{orderDetails.productName}</span>
                  </div>
                )}
                {/* Don't show quantity for buy-once orders as it's included in productName */}
                {orderDetails.deliveryDate && (
                  <div className="flex justify-between items-center">
                    <span>Delivery Date:</span>
                    <span className="font-medium flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {format(orderDetails.deliveryDate, "MMM dd, yyyy")}
                    </span>
                  </div>
                )}
                {orderDetails.totalAmount && (
                  <div className="flex justify-between border-t pt-2">
                    <span className="font-medium">Total Amount:</span>
                    <span className="font-semibold text-green-600">
                      ₹{orderDetails.totalAmount.toFixed(2)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Subscription Details */}
          {subscriptionDetails && (
            <div className="mt-6 bg-white rounded-lg p-4 space-y-3">
              <h4 className="font-medium text-gray-800 flex items-center gap-2">
                <Package className="w-4 h-4" />
                Subscription Details
              </h4>
              <div className="space-y-2 text-sm text-gray-600">
                {subscriptionDetails.subscriptionId && (
                  <div className="flex justify-between">
                    <span>Subscription ID:</span>
                    <span className="font-medium">{subscriptionDetails.subscriptionId}</span>
                  </div>
                )}
                {subscriptionDetails.productName && (
                  <div className="flex justify-between">
                    <span>Product:</span>
                    <span className="font-medium">{subscriptionDetails.productName}</span>
                  </div>
                )}
                {/* {subscriptionDetails.quantity && (
                  <div className="flex justify-between">
                    <span>Quantity:</span>
                    <span className="font-medium">{subscriptionDetails.quantity}</span>
                  </div>
                )} */}
                {subscriptionDetails.period && (
                  <div className="flex justify-between">
                    <span>Period:</span>
                    <span className="font-medium">{subscriptionDetails.period}</span>
                  </div>
                )}
                {subscriptionDetails.startDate && (
                  <div className="flex justify-between items-center">
                    <span>Start Date:</span>
                    <span className="font-medium flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {format(subscriptionDetails.startDate, "MMM dd, yyyy")}
                    </span>
                  </div>
                )}
                {subscriptionDetails.totalAmount && (
                  <div className="flex justify-between border-t pt-2">
                    <span className="font-medium">Total Amount:</span>
                    <span className="font-semibold text-green-600">
                      ₹{subscriptionDetails.totalAmount.toFixed(2)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="mt-6">
            <Button 
              onClick={handleClose}
              className="w-full bg-green-600 hover:bg-green-700 text-white"
            >
              Continue Shopping
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};