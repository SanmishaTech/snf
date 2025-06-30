import React, { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Plus, Minus, MapPin, X } from "lucide-react";
import { format, addDays } from 'date-fns';
import { DialogClose } from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { get, post } from "@/services/apiService";
import { toast } from "sonner";
import AddressForm from "@/modules/Address/components/AddressForm";
import { formatDate } from "@/lib/formatter";

interface ProductData {
  id: number;
  name: string;
  price: number;
  rate: number;
  unit?: string;
  depotVariantPricing?: {
    buyOncePrice: number;
    subscriptionPrice: number;
  };
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
  label?: string;
}

interface BuyOnceModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  product: ProductData | null | undefined;
  productId: string | undefined;

}

const getAddressLabelText = (label: string) => {
  switch (label?.toLowerCase()) {
    case 'home': return 'Home';
    case 'work': return 'Work';
    case 'other': return 'Other';
    default: return label || 'Address';
  }
};

export const BuyOnceModal: React.FC<BuyOnceModalProps> = ({
  isOpen,
  onOpenChange,
  product,
  productId,
}) => {
  const [quantity, setQuantity] = useState(1);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(addDays(new Date(), 1));

  const [userAddresses, setUserAddresses] = useState<AddressData[]>([]);
  const [isLoadingAddresses, setIsLoadingAddresses] = useState(false);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [showAddressFormView, setShowAddressFormView] = useState(false);

  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [buyOncePrice, setBuyOncePrice] = useState<number>(0);
  const [isLoadingPrice, setIsLoadingPrice] = useState(false);

  const getBuyOncePrice = () => {
    return product?.depotVariantPricing?.buyOncePrice || product?.price || product?.rate || 0;
  };

  useEffect(() => {
    const fetchBuyOncePrice = async () => {
      if (!isOpen || !productId) return;
      setIsLoadingPrice(true);
      try {
        const response = await get(`/api/products/${productId}/depot-variant-pricing`);
        setBuyOncePrice(response?.buyOncePrice || getBuyOncePrice());
      } catch (err) {
        console.error('Failed to fetch depot variant pricing, using default:', err);
        setBuyOncePrice(getBuyOncePrice());
      } finally {
        setIsLoadingPrice(false);
      }
    };
    fetchBuyOncePrice();
  }, [isOpen, productId, product]);

  useEffect(() => {
    const fetchWalletBalance = async () => {
      if (!isOpen) return;
      try {
        const resp = await get('/api/wallet/balance');
        setWalletBalance(resp?.balance || 0);
      } catch (err) {
        console.error('Failed to fetch wallet balance', err);
      }
    };
    fetchWalletBalance();
  }, [isOpen]);

  const fetchUserAddresses = async () => {
    setIsLoadingAddresses(true);
    try {
      const response = await get('/delivery-addresses');
      setUserAddresses(response || []);
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

  useEffect(() => {
    if (isOpen) {
      fetchUserAddresses();
    }
  }, [isOpen]);

  const formatDateForInput = (date: Date | undefined): string => {
    if (!date) return '';
    return format(date, 'yyyy-MM-dd');
  };

  const productTotal = useMemo(() => quantity * buyOncePrice, [quantity, buyOncePrice]);
  const walletDeduction = useMemo(() => Math.min(walletBalance || 0, productTotal), [walletBalance, productTotal]);
  const payableAmount = useMemo(() => productTotal - walletDeduction, [productTotal, walletDeduction]);

  const handleConfirm = async () => {
    if (!selectedDate || !selectedAddressId || !productId) {
      toast.error("Please select a delivery date and address.");
      return;
    }

    const payload = {
      subscriptions: [
        {
          productId: productId,
          period: 1, // This signifies a "buy once" order
          startDate: selectedDate.toISOString(),
          deliverySchedule: 'DAILY', // Single delivery
          qty: quantity,
        },
      ],
      deliveryAddressId: selectedAddressId,
      walletamt: walletDeduction,
    };

    try {
      await post('/api/product-orders/with-subscriptions', payload);
      toast.success("Order placed successfully!");
      onOpenChange(false);
    } catch (error: any) {
      console.error("Failed to place order:", error);
      toast.error(error?.response?.data?.message || "Failed to place order. Please try again.");
    }
  };

  const handleAddressSaveSuccess = (newAddress: AddressData) => {
    fetchUserAddresses();
    setSelectedAddressId(newAddress.id);
    setShowAddressFormView(false);
    toast.success("Address added successfully!");
  };

  if (!product) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md min-w-[800px] p-0 flex flex-col max-h-[90vh]">
        <DialogHeader className="p-6 pb-2 text-center border-b">
          <DialogClose className="absolute right-4 top-4 z-10 p-2 rounded-full hover:bg-gray-100" onClick={() => onOpenChange(false)}>
            <X className="h-5 w-5 text-gray-600" />
          </DialogClose>
          <DialogTitle className="text-xl font-bold text-center">
            {showAddressFormView ? 'Add New Delivery Address' : `${product?.name} - Buy Once`}
          </DialogTitle>
          {!showAddressFormView && product && (
            <div className="mt-1 text-right">
              <p className="text-xs text-gray-500">Buy Once Price:</p>
              {isLoadingPrice ? (
                <p className="text-md font-semibold">Loading...</p>
              ) : (
                <p className="text-md font-semibold">₹{buyOncePrice.toFixed(2)}</p>
              )}
            </div>
          )}
        </DialogHeader>

        <div className="p-6 grid gap-6 overflow-y-auto flex-grow pb-8">
          {showAddressFormView ? (
            <AddressForm
              mode="create"
              onSuccess={handleAddressSaveSuccess}
              onCancel={() => setShowAddressFormView(false)}
            />
          ) : (
            <>
              {/* Date and Address Selection Inputs - These remain as they are */}
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
                <Button 
                  variant="outline" 
                  className="mt-4 text-sm border-orange-500 text-orange-500 w-full hover:bg-orange-50" 
                  size="sm"
                  onClick={() => setShowAddressFormView(true)} 
                >
                  <Plus className="h-4 w-4 mr-2" /> Add New Address
                </Button>
              </div>

              <div className="flex justify-between items-center">
                <Label htmlFor="quantityBuyOnce" className="text-sm font-medium">Quantity:</Label>
                <div className="flex items-center border rounded-full overflow-hidden">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="h-10 w-10 p-0 flex items-center justify-center rounded-none hover:bg-gray-100 border-r"
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <span className="px-6 text-lg font-medium">{quantity}</span>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setQuantity(quantity + 1)}
                    className="h-10 w-10 p-0 flex items-center justify-center rounded-none hover:bg-gray-100 border-l"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

            {/* Integrated Order Summary Section */}
          <div className="mt-6 pt-4 border-t border-gray-200 space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Product:</span>
              <span className="text-sm font-medium text-gray-800">{product?.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Quantity:</span>
              <span className="text-sm font-medium text-gray-800">{quantity} {product?.unit || ''}</span>
            </div>
            <div className="flex justify-between">
                <span className="text-sm text-gray-600">Price per unit:</span>
                <span className="text-sm font-medium text-gray-800">₹{productTotal.toFixed(2)}</span>
              </div>
             
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Delivery Date:</span>
                <span className="text-sm font-medium text-gray-800">
                  {selectedDate ? format(selectedDate, "dd/MM/yyyy") : 'Not selected'}
                </span>
              </div>
              <div className="flex justify-between items-start">
                <span className="text-sm text-gray-600">Delivery Address:</span>
                {selectedAddressId && userAddresses.find(addr => addr.id === selectedAddressId) ? (
                  (() => {
                    const addr = userAddresses.find(ad => ad.id === selectedAddressId)!;
                    return (
                      <span className="text-sm font-medium text-gray-800 text-right max-w-[65%]">
                        {addr.label ? `${getAddressLabelText(addr.label)}: ` : ''}{addr.plotBuilding}, {addr.streetArea}, {addr.city} - {addr.pincode}
                      </span>
                    );
                  })()
                ) : (
                  <span className="text-sm font-medium text-gray-800">Not selected</span>
                )}
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Product Total:</span>
                <span className="text-sm font-medium text-gray-800">
                  ₹{productTotal.toFixed(2)}
                </span>
              </div>
              {walletDeduction > 0 && (
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Wallet Deduction:</span>
                  <span className="text-sm font-medium text-green-600">-₹{walletDeduction.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between pt-2 mt-2 border-t border-dashed">
                <span className="text-gray-700 font-semibold text-base">Amount Payable:</span>
                <span className="font-bold text-green-600 text-base">
                  ₹{payableAmount.toFixed(2)}
                </span>
              </div>
            </div>
            </>
          )}
        </div>

        {/* Footer with Confirm Button */}
        {!showAddressFormView && (
          <DialogFooter className="p-6 border-t">
            <Button 
              variant="outline" 
              onClick={() => {
                onOpenChange(false);
                setShowAddressFormView(false); // Reset view on modal close
              }} 
              className="mr-2"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleConfirm} 
              disabled={!selectedDate || !selectedAddressId || quantity < 1}
              className="w-full max-w-[20rem] bg-green-600 hover:bg-green-700 text-white py-3 text-base rounded-md disabled:bg-gray-300"
            >
              Confirm Order & Pay ₹{payableAmount.toFixed(2)}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
};
