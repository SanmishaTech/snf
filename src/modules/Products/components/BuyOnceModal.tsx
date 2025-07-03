import React, { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Minus, MapPin, X, Wallet } from "lucide-react";
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

interface DepotVariant {
  id: number;
  name: string;
  depot: {
    id: number;
    name: string;
    isOnline: boolean;
  };
  buyOncePrice: number;
  sellingPrice: number;
  mrp?: number; // Maximum Retail Price for savings calculation
  price3Day?: number;
  price7Day?: number;
  price15Day?: number;
  price1Month?: number;
  minimumQty: number;
}

interface DepotVariantPricingResponse {
  productId: number;
  variants: DepotVariant[];
  buyOncePrice: number;
}

interface LocationData {
  id: number;
  name: string;
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
  locationId?: number;
  location?: LocationData;
}

interface BuyOnceModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  product: ProductData | null | undefined;
  productId: string | undefined;
  selectedDepot?: {
    id: number;
    name: string;
    isOnline: boolean;
    address: string;
    addressId: string;
    city: string;
    state: string;
    pincode: string;
  } | null;
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
  selectedDepot,
}) => {
  const [quantity, setQuantity] = useState(1);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(addDays(new Date(), 2));

  const [userAddresses, setUserAddresses] = useState<AddressData[]>([]);
  const [isLoadingAddresses, setIsLoadingAddresses] = useState(false);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [showAddressFormView, setShowAddressFormView] = useState(false);

  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [buyOncePrice, setBuyOncePrice] = useState<number>(0);
  const [mrpPrice, setMrpPrice] = useState<number>(0);
  const [isLoadingPrice, setIsLoadingPrice] = useState(false);
  const [depotVariants, setDepotVariants] = useState<DepotVariant[]>([]);
  const [selectedVariantId, setSelectedVariantId] = useState<number | null>(null);
  const [locations, setLocations] = useState<LocationData[]>([]);

  // Fetch locations list when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchLocations();
    }
  }, [isOpen]);

  // Fetch list of serviceable locations (used in AddressForm)
  const fetchLocations = async () => {
    try {
      const response = await get("/admin/locations");
      if (response && Array.isArray(response.locations)) {
        setLocations(response.locations);
      }
    } catch (error) {
      console.error("Failed to fetch locations:", error);
      toast.error("Could not load locations.");
    }
  }

  const getBuyOncePrice = () => {
    return product?.depotVariantPricing?.buyOncePrice || product?.price || product?.rate || 0;
  };

  useEffect(() => {
    const fetchDepotVariantPricing = async () => {
      if (!isOpen || !productId) return;
      setIsLoadingPrice(true);
      try {
        // Use the public depot-variants API for consistent MRP data
        const response = await get(`/api/public/depot-variants/${productId}`);
        let filteredVariants = response?.data || [];

        // Filter variants based on selected depot if one is selected
        if (selectedDepot) {
          filteredVariants = filteredVariants.filter((variant: any) => variant.depot.id === selectedDepot.id);
        }

        // Transform the variants to match our interface
        const transformedVariants = filteredVariants.map((variant: any) => ({
          id: parseInt(variant.id, 10),
          name: variant.name,
          depot: variant.depot,
          buyOncePrice: parseFloat(variant.buyOncePrice) || 0,
          sellingPrice: parseFloat(variant.price) || 0,
          mrp: parseFloat(variant.mrp) || parseFloat(variant.price) || 0,
          minimumQty: variant.minimumQty || 0,
        }));

        setDepotVariants(transformedVariants);

        // Set buyOncePrice and MRP from first filtered variant or fallback
        if (transformedVariants.length > 0) {
          const firstVariant = transformedVariants[0];
          setBuyOncePrice(firstVariant.buyOncePrice);
          setMrpPrice(firstVariant.mrp || firstVariant.sellingPrice || firstVariant.buyOncePrice);
          setSelectedVariantId(firstVariant.id);
        } else {
          setBuyOncePrice(getBuyOncePrice());
          setMrpPrice(getBuyOncePrice());
          setSelectedVariantId(null);
        }
      } catch (err) {
        console.error('Failed to fetch depot variant pricing, using default:', err);
        setBuyOncePrice(getBuyOncePrice());
        setMrpPrice(getBuyOncePrice());
        setDepotVariants([]);
        setSelectedVariantId(null);
      } finally {
        setIsLoadingPrice(false);
      }
    };
    fetchDepotVariantPricing();
  }, [isOpen, productId, product, selectedDepot]);

  useEffect(() => {
    const fetchWalletBalance = async () => {
      if (!isOpen) return;
      try {
        const resp = await get('/api/wallet/balance');
        console.log('Wallet balance response:', resp);

        // Handle different response formats
        let balance = 0;
        if (resp?.success && resp?.data?.balance !== undefined) {
          // Format: {"success":true,"data":{"balance":55,"currency":"INR"}}
          balance = resp.data.balance;
        } else if (resp?.balance !== undefined) {
          // Format: {"balance":55}
          balance = resp.balance;
        } else if (typeof resp === 'number') {
          // Format: 55
          balance = resp;
        }

        setWalletBalance(balance);
      } catch (err) {
        console.error('Failed to fetch wallet balance', err);
        setWalletBalance(0);
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

  const [useWallet, setUseWallet] = useState(true);
  const productTotal = useMemo(() => quantity * buyOncePrice, [quantity, buyOncePrice]);
  const walletDeduction = useMemo(() => (useWallet ? Math.min(walletBalance || 0, productTotal) : 0), [walletBalance, productTotal, useWallet]);
  const payableAmount = useMemo(() => productTotal - walletDeduction, [productTotal, walletDeduction]);
  
  // Calculate savings vs MRP
  const calculateSavings = useMemo(() => {
    if (!mrpPrice || mrpPrice <= buyOncePrice) return 0;
    const totalMrpPrice = mrpPrice * quantity;
    const totalBuyOncePrice = buyOncePrice * quantity;
    return Math.max(0, totalMrpPrice - totalBuyOncePrice);
  }, [mrpPrice, buyOncePrice, quantity]);

  const handleConfirm = async () => {
    if (!selectedDate || !selectedAddressId || !selectedVariantId) {
      toast.error("Please select a delivery date, address, and depot variant.");
      return;
    }

    const payload = {
      subscriptions: [
        {
          productId: selectedVariantId, // Use selected depot variant ID
          period: 1, // This signifies a "buy once" order
          startDate: selectedDate.toISOString(),
          deliverySchedule: 'DAILY', // Single delivery
          qty: quantity,
        },
      ],
      deliveryAddressId: parseInt(selectedAddressId, 10),
      walletamt: useWallet ? walletDeduction : 0,
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
      <DialogContent className="w-full max-w-4xl mx-auto p-0 flex flex-col max-h-[95vh] overflow-hidden">
        <DialogHeader className="px-4 py-4 sm:px-6 sm:py-6 pb-2 border-b bg-gradient-to-r from-green-50 to-blue-50">
          <DialogClose className="absolute right-3 top-3 sm:right-4 sm:top-4 z-10 p-2 rounded-full hover:bg-white/80 transition-colors" onClick={() => onOpenChange(false)}>
          </DialogClose>
          <DialogTitle className="text-lg sm:text-xl font-bold text-center pr-8">
            {showAddressFormView ? 'Add New Delivery Address' : `${product?.name} - Buy Once`}
          </DialogTitle>
          {!showAddressFormView && product && (
            <div className="mt-2 flex justify-center">
              <div className="bg-white/80 backdrop-blur-sm rounded-lg px-4 py-2 border border-green-200">
                <p className="text-xs text-gray-600 text-center">Buy Once Price</p>
                {isLoadingPrice ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="animate-spin h-4 w-4 border-2 border-green-500 border-t-transparent rounded-full"></div>
                    <p className="text-sm font-semibold">Loading...</p>
                  </div>
                ) : (
                  <div className="text-center">
                    <p className="text-lg font-bold text-green-600">₹{Number(buyOncePrice || 0).toFixed(2)}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogHeader>

        <div className="p-4 sm:p-6 space-y-4 sm:space-y-6 overflow-y-auto flex-grow pb-8">
          {showAddressFormView ? (
            <AddressForm
              mode="create"
              onSuccess={handleAddressSaveSuccess}
              onCancel={() => setShowAddressFormView(false)}
              locations={locations}
            />
          ) : (
            <>
              {/* Date and Address Selection Inputs - These remain as they are */}


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
                        onClick={() => setSelectedAddressId(address.id)}
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

              {/* Depot Variant Selection */}
              <div>
                <Label className="text-sm font-medium mb-2 block">
                  {selectedDepot ? `Available variants for ${selectedDepot.name}:` : 'Available depot variants:'}
                </Label>
                {depotVariants.length > 0 ? (
                  <RadioGroup
                    value={selectedVariantId?.toString() || ''}
                    onValueChange={(value) => {
                      const variantId = parseInt(value, 10);
                      setSelectedVariantId(variantId);
                      const selectedVariant = depotVariants.find(v => v.id === variantId);
                      if (selectedVariant) {
                        setBuyOncePrice(selectedVariant.buyOncePrice);
                        setMrpPrice(selectedVariant.mrp || selectedVariant.sellingPrice || selectedVariant.buyOncePrice);
                      }
                    }}
                    className="gap-3 mt-2"
                  >
                    {depotVariants.map((variant) => (
                      <div
                        key={variant.id}
                        className={`border rounded-lg p-3 cursor-pointer ${selectedVariantId === variant.id ? 'border-green-500 bg-green-50' : 'border-gray-200'
                          }`}
                        onClick={() => {
                          setSelectedVariantId(variant.id);
                          setBuyOncePrice(variant.buyOncePrice);
                          setMrpPrice(variant.mrp || variant.sellingPrice || variant.buyOncePrice);
                        }}
                      >
                        <div className="flex items-start gap-3">
                          <RadioGroupItem value={variant.id.toString()} id={`variant-${variant.id}`} className="mt-1" />
                          <div className="flex-1">
                            <div className="flex justify-between items-start">
                              <Label
                                htmlFor={`variant-${variant.id}`}
                                className="font-medium cursor-pointer flex items-center gap-1"
                              >
                                {variant.name}
                                <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                                  {variant.depot.isOnline ? 'Online' : 'Offline'}
                                </span>
                              </Label>
                              <div className="text-right">
                                <span className="text-sm font-semibold text-green-600">
                                  ₹{Number(variant.buyOncePrice || 0).toFixed(2)}
                                </span>
                              </div>
                            </div>

                          </div>
                        </div>
                      </div>
                    ))}
                  </RadioGroup>
                ) : (
                  <div className="text-center py-4 border border-dashed border-gray-300 rounded-lg">
                    <p className="text-gray-500">
                      {selectedDepot
                        ? `No variants available for ${selectedDepot.name}`
                        : 'No depot variants available for this product'
                      }
                    </p>
                    <p className="text-gray-500 text-sm mt-1">Please try selecting a different depot.</p>
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <Label htmlFor="quantityBuyOnce" className="text-sm font-medium block">Quantity:</Label>
                <div className="flex items-center justify-center">
                  <div className="flex items-center border-2 border-green-200 rounded-xl overflow-hidden bg-white shadow-sm">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      className="h-12 w-12 p-0 flex items-center justify-center rounded-none hover:bg-green-50 border-r border-green-200 transition-colors"
                    >
                      <Minus className="h-5 w-5 text-green-600" />
                    </Button>
                    <span className="px-6 py-3 text-xl font-bold text-green-700 min-w-[80px] text-center">{quantity}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setQuantity(quantity + 1)}
                      className="h-12 w-12 p-0 flex items-center justify-center rounded-none hover:bg-green-50 border-l border-green-200 transition-colors"
                    >
                      <Plus className="h-5 w-5 text-green-600" />
                    </Button>
                  </div>
                </div>
              </div>

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
              <div className="bg-green-50 p-3 rounded-md border border-green-100">
                <p className="text-xs text-primary flex items-start">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4 mr-1.5 mt-0.5 flex-shrink-0"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  This is not a cash on delivery. But Amount will be collected, Our team will contact you for futher instructions
                </p>
              </div>

              {/* Wallet and Order Summary Section */}
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <div className="flex items-center justify-between mb-3">
                  <Label className="flex items-center gap-2 text-sm font-medium cursor-pointer">

                    <Wallet className="h-4 w-4" /> Use Wallet Balance
                  </Label>
                  <div className="text-sm font-medium">
                    Available: ₹{walletBalance.toFixed(2)}
                  </div>
                </div>

                {useWallet && walletBalance > 0 && (
                  <div className="bg-white p-3 rounded border border-blue-300">
                    <div className="text-xs text-blue-700 space-y-1">
                      <div className="flex justify-between">
                        <span>Wallet Balance:</span>
                        <span>₹{walletBalance.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Amount to be deducted:</span>
                        <span className="font-medium text-green-600">₹{walletDeduction.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between font-medium pt-1 border-t">
                        <span>Remaining in wallet:</span>
                        <span>₹{(walletBalance - walletDeduction).toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                )}
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
          <DialogFooter className="p-4 sm:p-6 border-t bg-gray-50">
            <div className="space-y-3 w-full">
              {/* Savings Summary Section */}
              {calculateSavings > 0 && (
                <div className="flex items-center justify-center gap-2 text-sm">
                  <div className="flex items-center gap-1 text-green-600">
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                    <span className="font-medium">You Save: ₹{calculateSavings.toFixed(2)}</span>
                  </div>
                  <span className="text-gray-500 text-xs">vs MRP pricing</span>
                </div>
              )}
              
              <div className="flex flex-col sm:flex-row gap-3 w-full">
                <Button
                  variant="outline"
                  onClick={() => {
                    onOpenChange(false);
                    setShowAddressFormView(false); // Reset view on modal close
                  }}
                  className="flex-1 sm:flex-none sm:min-w-[120px] py-3 text-base border-gray-300 hover:bg-gray-100 transition-colors"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleConfirm}
                  disabled={!selectedDate || !selectedAddressId || !selectedVariantId || quantity < 1}
                  className="flex-1 sm:flex-auto bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white py-3 text-base font-semibold rounded-lg shadow-md disabled:from-gray-300 disabled:to-gray-400 disabled:shadow-none transition-all duration-200"
                >
                  <span className="hidden sm:inline">Confirm Order & Pay ₹{payableAmount.toFixed(2)}</span>
                  <span className="sm:hidden">Pay ₹{payableAmount.toFixed(2)}</span>
                </Button>
              </div>
            </div>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
};
