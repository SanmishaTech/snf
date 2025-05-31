import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Plus, Minus, MapPin } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { get } from "@/services/apiService";
import { toast } from "sonner";

interface ProductData {
  id: number;
  name: string;
  price: number;
  rate: number;
}

interface AddressData {
  id: string;
  recipientName: string;
  mobile: string;
  plotBuilding: string;
  streetArea: string;
  landmark?: string;
  pincode: string;
  city: string;
  state: string;
  isDefault?: boolean;
  label: string;         // Address label (Home, Work, Other)
}

interface BuyOnceModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  product: ProductData | null | undefined;
  productId: string | undefined;
  onBuyOnceConfirm: (details: { 
    productId: string | undefined;
    quantity: number;
    selectedDate: Date | undefined;
    selectedAddress: string; // Address ID for delivery
  }) => void;
}

export const BuyOnceModal: React.FC<BuyOnceModalProps> = ({
  isOpen,
  onOpenChange,
  product,
  productId,
  onBuyOnceConfirm,
}) => {
  const [quantity, setQuantity] = useState(1);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  
  // Address selection states
  const [userAddresses, setUserAddresses] = useState<AddressData[]>([]);
  const [isLoadingAddresses, setIsLoadingAddresses] = useState(false);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);

  // Helper to format date to YYYY-MM-DD for input[type="date"]
  const formatDateForInput = (date: Date | undefined): string => {
    if (!date) return '';
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Fetch user addresses when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchUserAddresses();
    }
  }, [isOpen]);

  // Function to fetch user addresses
  const fetchUserAddresses = async () => {
    setIsLoadingAddresses(true);
    try {
      const response = await get('/delivery-addresses');
      setUserAddresses(response || []);
      
      // Auto-select default address if available
      const defaultAddress = response?.find((addr: AddressData) => addr.isDefault);
      if (defaultAddress) {
        setSelectedAddressId(defaultAddress.id);
      } else if (response?.length > 0) {
        setSelectedAddressId(response[0].id);
      }
    } catch (err) {
      console.error('Failed to fetch addresses:', err);
      toast.error('Could not load your delivery addresses');
    } finally {
      setIsLoadingAddresses(false);
    }
  };

  const handleConfirm = () => {
    if (!selectedDate) {
      toast.error("Please select a delivery date.");
      return;
    }

    if (!selectedAddressId) {
      toast.error("Please select a delivery address.");
      return;
    }
    
    onBuyOnceConfirm({
      productId,
      quantity,
      selectedDate,
      selectedAddress: selectedAddressId,
    });
    
    onOpenChange(false);
    setSelectedDate(new Date()); 
    setQuantity(1);
  };

  if (!product) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md min-w-[500px] p-0">
        <DialogHeader className="p-6 pb-2 text-center border-b">
          <DialogTitle className="text-xl font-bold">{product?.name} - Buy Once</DialogTitle>
          <div className="mt-1 text-right">
            <p className="text-xs text-gray-500">MRP:</p>
            <p className="text-md font-semibold">₹{product?.rate}</p>
          </div>
        </DialogHeader>

        <div className="p-6 grid gap-6">
          <div>
            <Label htmlFor="deliveryDateBuyOnce" className="text-sm font-medium mb-2 block">Select delivery date:</Label>
            <input
              type="date"
              id="deliveryDateBuyOnce"
              value={formatDateForInput(selectedDate)}
              onChange={(e) => {
                if (e.target.value) {
                  setSelectedDate(new Date(e.target.value + 'T00:00:00')); // Ensure date is parsed in local timezone
                } else {
                  setSelectedDate(undefined);
                }
              }}
              min={formatDateForInput(new Date())} // Disable past dates
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500"
            />
            {!selectedDate && (
                 <p className="text-xs text-red-500 mt-1">Please select a delivery date.</p>
            )}
          </div>

          {/* Delivery Address Selection */}
          <div>
            <Label className="text-sm font-medium mb-2 block">Select delivery address:</Label>
            {isLoadingAddresses ? (
              <div className="text-center py-4">Loading addresses...</div>
            ) : userAddresses.length > 0 ? (
              <RadioGroup 
                value={selectedAddressId || ''} 
                onValueChange={setSelectedAddressId}
                className="gap-3 mt-2"
              >
                {userAddresses.map((address) => (
                  <div 
                    key={address.id}
                    className={`border rounded-lg p-3 cursor-pointer ${selectedAddressId === address.id ? 'border-green-500 bg-green-50' : 'border-gray-200'}`}
                  >
                    <div className="flex items-start gap-3">
                      <RadioGroupItem value={address.id} id={`address-${address.id}`} className="mt-1" />
                      <div className="flex-1">
                        <div className="flex justify-between items-start">
                          <Label 
                            htmlFor={`address-${address.id}`} 
                            className="font-medium cursor-pointer flex items-center gap-1"
                          >
                            {address.label} 
                            {address.isDefault && <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full">Default</span>}
                          </Label>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">{address.recipientName} • {address.mobile}</p>
                        <p className="text-sm text-gray-600 mt-0.5">
                          {address.plotBuilding}, {address.streetArea}
                          {address.landmark ? `, ${address.landmark}` : ''}, {address.city}, {address.state} - {address.pincode}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </RadioGroup>
            ) : (
              <div className="text-center py-4 border border-dashed border-gray-300 rounded-lg">
                <MapPin className="mx-auto h-6 w-6 text-gray-400 mb-2" />
                <p className="text-gray-500">No saved addresses found.</p>
                <p className="text-gray-500 text-sm">Please add an address in your profile first.</p>
              </div>
            )}
          </div>

          <div className="flex justify-between items-center">
            <Label htmlFor="quantity-buy-once" className="text-sm font-medium">Quantity:</Label>
            <div className="flex items-center border rounded-md overflow-hidden">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="h-8 w-8 p-0 flex items-center justify-center rounded-none hover:bg-gray-100 text-gray-700"
                aria-label="Decrease quantity"
              >
                <Minus className="h-4 w-4" />
              </Button>
              <span id="quantity-buy-once" className="px-4 text-sm font-medium text-gray-800">{quantity}</span>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setQuantity(quantity + 1)}
                className="h-8 w-8 p-0 flex items-center justify-center rounded-none hover:bg-gray-100 text-gray-700"
                aria-label="Increase quantity"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
        <DialogFooter className="p-6 pt-2 border-t">
          <Button 
            onClick={handleConfirm} 
            className="w-full bg-green-500 hover:bg-green-600 text-white py-3 rounded-md font-medium text-base"
            disabled={!selectedDate}
          >
            Confirm Purchase
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
