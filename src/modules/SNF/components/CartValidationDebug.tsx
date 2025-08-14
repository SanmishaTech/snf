import React from 'react';
import { useCart } from '../context/CartContext';
import { useDeliveryLocation } from '../hooks/useDeliveryLocation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, CheckCircle, RefreshCw } from 'lucide-react';

/**
 * Debug component to test cart validation functionality
 * Shows current cart state, depot info, and validation status
 */
export const CartValidationDebug: React.FC = () => {
  const { 
    state, 
    validateCart, 
    getAvailableItems, 
    getUnavailableItems,
    subtotal,
    availableSubtotal 
  } = useCart();
  const { currentDepotId, deliveryLocation } = useDeliveryLocation();

  const availableItems = getAvailableItems();
  const unavailableItems = getUnavailableItems();

  const handleValidateCart = async () => {
    if (currentDepotId) {
      await validateCart(currentDepotId);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <RefreshCw className="size-5" />
          Cart Validation Debug
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current Depot Info */}
        <div className="p-3 bg-muted rounded-lg">
          <h3 className="font-medium mb-2">Current Depot</h3>
          <div className="text-sm space-y-1">
            <p><strong>Depot ID:</strong> {currentDepotId || 'Not set'}</p>
            <p><strong>Depot Name:</strong> {deliveryLocation?.depotName || 'Not set'}</p>
            <p><strong>Pincode:</strong> {deliveryLocation?.pincode || 'Not set'}</p>
            <p><strong>Area:</strong> {deliveryLocation?.areaName || 'Not set'}</p>
          </div>
        </div>

        {/* Cart Summary */}
        <div className="grid grid-cols-2 gap-4">
          <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle className="size-4 text-green-600" />
              <span className="font-medium text-green-800">Available</span>
            </div>
            <p className="text-2xl font-bold text-green-600">{availableItems.length}</p>
            <p className="text-sm text-green-600">₹{availableSubtotal.toFixed(0)}</p>
          </div>
          
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className="size-4 text-amber-600" />
              <span className="font-medium text-amber-800">Unavailable</span>
            </div>
            <p className="text-2xl font-bold text-amber-600">{unavailableItems.length}</p>
            <p className="text-sm text-amber-600">₹{(subtotal - availableSubtotal).toFixed(0)}</p>
          </div>
        </div>

        {/* Cart Items */}
        {state.items.length > 0 && (
          <div className="space-y-2">
            <h3 className="font-medium">Cart Items</h3>
            {state.items.map((item) => (
              <div 
                key={item.variantId} 
                className={`p-3 border rounded-lg ${
                  item.isAvailable === false ? 'bg-amber-50 border-amber-200' : 'bg-green-50 border-green-200'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="font-medium">{item.name}</p>
                    <p className="text-sm text-muted-foreground">{item.variantName}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant={item.isAvailable === false ? 'destructive' : 'default'}>
                        {item.isAvailable === false ? 'Unavailable' : 'Available'}
                      </Badge>
                      <span className="text-sm">Qty: {item.quantity}</span>
                      <span className="text-sm">₹{item.price}</span>
                      <span className="text-sm">Depot: {item.depotId}</span>
                    </div>
                    {item.unavailableReason && (
                      <p className="text-sm text-amber-600 mt-1">{item.unavailableReason}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {state.items.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            Cart is empty. Add some items to test validation.
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          <Button 
            onClick={handleValidateCart}
            disabled={!currentDepotId || state.items.length === 0}
          >
            <RefreshCw className="size-4 mr-2" />
            Validate Cart
          </Button>
          
          <Button variant="outline" asChild>
            <a href="/snf">Add Items</a>
          </Button>
        </div>

        {/* Instructions */}
        <div className="text-xs text-muted-foreground space-y-1">
          <p><strong>Test Instructions:</strong></p>
          <p>1. Add items to cart from different depot locations</p>
          <p>2. Change delivery location in header</p>
          <p>3. Watch items automatically validate and show availability</p>
          <p>4. Items from other depots will show as unavailable</p>
          <p>5. Common items will hot-swap to current depot's variant</p>
          <p><strong>Fixed:</strong> Validation loop issue resolved - should only validate on depot changes</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default CartValidationDebug;