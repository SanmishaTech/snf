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
import { formatDate } from "@/lib/formatter";
import { INDIAN_STATES } from "@/config/states";
import imageurl from "./IMG-20250724-WA0006.jpg"
import {
  getPublicAreaMasters,
  validateDairySupport,
  validatePincodeInAreas,
  type AreaMaster,
} from "@/services/areaMasterService";
import { getCitiesList, type City } from "@/services/cityMasterService";
import { createLead } from "@/services/leadService";
import { ServiceNotAvailableDialog, EnhancedLeadCaptureModal } from "@/modules/Lead";
import { PincodeValidator } from "@/components/ui/PincodeValidator";
import { SuccessDialog } from "@/components/ui/SuccessDialog";

interface ProductData {
  id: number;
  name: string;
  price: number;
  rate: number;
  unit?: string;
  isDairyProduct?: boolean; // Flag to indicate if product is dairy
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
    address?: string;
    city?: string;
    pincode?: string;
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


interface LocationData {
  id: number;
  name: string;
  city?: {
    id: number;
    name: string;
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
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(addDays(new Date(), 3));

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
  const [areaMasters, setAreaMasters] = useState<AreaMaster[]>([]);
  const [filteredAreaMasters, setFilteredAreaMasters] = useState<AreaMaster[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [selectedCityId, setSelectedCityId] = useState<number | null>(null);
  const [selectedAreaMaster, setSelectedAreaMaster] = useState<AreaMaster | null>(null);
  const [showServiceNotAvailableDialog, setShowServiceNotAvailableDialog] = useState(false);
  const [serviceNotAvailableMessage, setServiceNotAvailableMessage] = useState<string>("");
  const [showEnhancedLeadModal, setShowEnhancedLeadModal] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [successDetails, setSuccessDetails] = useState<{
    orderId?: string;
    totalAmount?: number;
  }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deliveryInstructions, setDeliveryInstructions] = useState<string>("");
  
  // Pincode validation state
  const [pincodeValidation, setPincodeValidation] = useState<{
    isValid: boolean;
    message: string;
    isValidating: boolean;
  }>({ isValid: false, message: "", isValidating: false });
  
  // Address form state (matching SubscriptionModal)
  const [addressFormState, setAddressFormState] = useState({
    recipientName: "",
    mobile: "",
    plotBuilding: "",
    streetArea: "",
    landmark: "",
    pincode: "",
    city: "Dombivli",
    state: "Maharashtra",
    isDefault: false,
    label: "Home",
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Fetch area masters and cities when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchAreaMasters();
      fetchCities();
      // Reset selections when modal opens
      setSelectedCityId(null);
      setSelectedAreaMaster(null);
      // Clear any existing form errors
      setFormErrors({});
      // Reset pincode validation
      setPincodeValidation({ isValid: false, message: "", isValidating: false });
    }
  }, [isOpen]);

  // Fetch list of serviceable area masters
  const fetchAreaMasters = async () => {
    try {
      const areaMastersList = await getPublicAreaMasters();
      setAreaMasters(areaMastersList);
    } catch (error) {
      console.error("Failed to fetch area masters:", error);
      toast.error("Could not load delivery areas.");
    }
  };

  // Fetch list of cities
  const fetchCities = async () => {
    try {
      const citiesList = await getCitiesList();
      setCities(citiesList);
    } catch (error) {
      console.error("Failed to fetch cities:", error);
      toast.error("Could not load cities.");
    }
  };

  // Filter areas based on selected city
  useEffect(() => {
    if (selectedCityId && areaMasters.length > 0) {
      // Filter areas by cityId - more strict filtering
      const filtered = areaMasters.filter(area => {
        // Check cityId first (primary association)
        if (area.cityId) {
          return area.cityId === selectedCityId;
        }
        // Fallback to city object id if cityId is not available
        if (area.city?.id) {
          return area.city.id === selectedCityId;
        }
        // Don't show areas without city association when a city is selected
        return false;
      });
      setFilteredAreaMasters(filtered);
    } else {
      // When no city is selected, show all areas
      setFilteredAreaMasters(areaMasters);
    }
  }, [selectedCityId, areaMasters]);

  // Handle area master selection and dairy validation
  const handleAreaMasterSelection = async (areaMaster: AreaMaster) => {
    console.log('handleAreaMasterSelection called with:', areaMaster.name);
    
    setSelectedAreaMaster(areaMaster);
    
    // Clear area master error when user selects an area
    if (formErrors.areaMaster) {
      setFormErrors(prev => ({
        ...prev,
        areaMaster: ''
      }));
    }
    
    // Auto-fill city from selected area master
    if (areaMaster.city?.name) {
      handleAddressChange("city", areaMaster.city.name);
    }
    
    // Store dairy validation message for later use during save, but don't show dialog immediately
    if (product?.isDairyProduct && !areaMaster.isDairyProduct) {
      const message = `We don't currently serve dairy products in ${areaMaster.name}. However, we'd love to expand our dairy delivery services to your area!`;
      setServiceNotAvailableMessage(message);
    } else {
      // Area is valid for this product type
      setServiceNotAvailableMessage("");
    }
    
    // If pincode is already filled, revalidate it against the newly selected area
    if (addressFormState.pincode && addressFormState.pincode.length === 6) {
      console.log('Revalidating pincode against newly selected area:', {
        pincode: addressFormState.pincode,
        areaMaster: areaMaster.name
      });
      validatePincode(addressFormState.pincode, areaMaster);
    }
  };

  // Address form handlers (matching SubscriptionModal)
  const handleAddressChange = (field: keyof typeof addressFormState, value: string | boolean) => {
    setAddressFormState(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear the error for this field when it's programmatically updated
    if (formErrors[field as string]) {
      setFormErrors(prev => ({
        ...prev,
        [field as string]: ''
      }));
    }
  };

  const handleAddressFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    const fieldValue = type === 'checkbox' ? checked : value;
    
    setAddressFormState(prev => ({
      ...prev,
      [name]: fieldValue
    }));
    
    // Clear the error for this field when user starts typing/correcting
    if (formErrors[name]) {
      setFormErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
    
    // Validate pincode when it changes
    if (name === 'pincode' && value.length === 6 && /^\d{6}$/.test(value)) {
      validatePincode(value);
    } else if (name === 'pincode') {
      // Clear validation when pincode is incomplete
      setPincodeValidation({ isValid: false, message: "", isValidating: false });
    }
  };

  const handleAddressLabelChange = (value: string) => {
    setAddressFormState(prev => ({
      ...prev,
      label: value
    }));
    
    // Clear the error for label field when user selects/changes it
    if (formErrors.label) {
      setFormErrors(prev => ({
        ...prev,
        label: ''
      }));
    }
  };
  
  // Pincode validation function
  const validatePincode = (pincode: string, areaMaster?: AreaMaster | null) => {
    const currentAreaMaster = areaMaster || selectedAreaMaster;
    console.log('validatePincode called with:', { pincode, currentAreaMaster: currentAreaMaster?.name });
    
    if (pincode.length === 6 && /^\d{6}$/.test(pincode)) {
      setPincodeValidation({ isValid: false, message: "", isValidating: true });
      
      // Validate pincode against the selected area master immediately (no setTimeout)
      const validation = validatePincodeInAreas(pincode, [currentAreaMaster].filter(Boolean) as AreaMaster[]);
      
      setPincodeValidation({
        isValid: validation.isValid,
        message: validation.isValid 
          ? `Great ! We deliver in your location` 
          : `We currently don't serve pincode ${pincode} in ${currentAreaMaster?.name || 'this area'}.`,
        isValidating: false
      });
    }
  };
  
  
  // Handle request service button click
  const handleRequestService = () => {
    console.log('handleRequestService called with form state:', {
      pincode: addressFormState.pincode,
      selectedArea: selectedAreaMaster?.name,
      city: addressFormState.city
    });
    
    // Pre-fill service not available message
    const message = selectedAreaMaster 
      ? `We currently don't serve pincode ${addressFormState.pincode} in ${selectedAreaMaster.name}. Help us prioritize expanding to your area!`
      : `We currently don't serve pincode ${addressFormState.pincode}. Help us prioritize expanding to your area!`;
    
    setServiceNotAvailableMessage(message);
    setShowEnhancedLeadModal(true);
  };

  const validateAddressForm = (): boolean => {
    const errors: Record<string, string> = {};
    if (!addressFormState?.recipientName?.trim())
      errors.recipientName = "Recipient name is required.";
    if (!addressFormState?.mobile?.trim())
      errors.mobile = "Mobile number is required.";
    else if (!/^\d{10}$/.test(addressFormState.mobile.trim()))
      errors.mobile = "Mobile number must be 10 digits.";
    if (!addressFormState?.plotBuilding?.trim())
      errors.plotBuilding = "Plot/Building is required.";
    if (!addressFormState?.streetArea?.trim())
      errors.streetArea = "Street/Area is required.";
    if (!addressFormState?.pincode?.trim())
      errors.pincode = "Pincode is required.";
    else if (!/^\d{6}$/.test(addressFormState.pincode.trim()))
      errors.pincode = "Pincode must be 6 digits.";
    if (!addressFormState?.city?.trim()) errors.city = "City is required.";
    if (!addressFormState?.state?.trim()) errors.state = "State is required.";
    if (!addressFormState?.label?.trim())
      errors.label = "Address label is required.";
    
    // Area master selection is required
    if (!selectedAreaMaster) {
      errors.areaMaster = "Please select a delivery area.";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSaveAddress = async () => {
    if (!validateAddressForm()) return;
    
    // Check if this is a dairy product in a non-dairy area
    const isDairyProductInNonDairyArea = product?.isDairyProduct && 
      selectedAreaMaster && 
      !selectedAreaMaster.isDairyProduct;
    
    // Check if pincode is not serviceable in the selected area
    const pincodeValidationResult = selectedAreaMaster ? 
      validatePincodeInAreas(addressFormState.pincode, [selectedAreaMaster]) : 
      { isValid: false, matchedAreas: [], message: "No area selected" };
    
    const isAreaNotServiceable = !pincodeValidationResult.isValid;
    
    if (isDairyProductInNonDairyArea || isAreaNotServiceable) {
      // Create lead instead of address
      const leadData = {
        name: addressFormState.recipientName,
        mobile: addressFormState.mobile,
        email: "",
        plotBuilding: addressFormState.plotBuilding,
        streetArea: addressFormState.streetArea,
        landmark: addressFormState.landmark || "",
        pincode: addressFormState.pincode,
        city: addressFormState.city,
        state: addressFormState.state,
        productId: product?.id,
        isDairyProduct: product?.isDairyProduct || false,
        notes: isDairyProductInNonDairyArea ? 
          `Lead captured from buy-once modal - Dairy product not available in area: ${selectedAreaMaster?.name}` :
          `Lead captured from buy-once modal - Pincode ${addressFormState.pincode} not serviceable in area: ${selectedAreaMaster?.name}`
      };

      try {
        await createLead(leadData);
        toast.success("Thank you for your interest! We've noted your details and will contact you when we expand dairy delivery to your area.");
        
        // Show area not served message
        const message = isDairyProductInNonDairyArea ? 
          `We don't currently serve dairy products in ${selectedAreaMaster?.name}. However, we'd love to expand our dairy delivery services to your area! We've saved your details and will notify you when service becomes available.` :
          `We don't currently serve pincode ${addressFormState.pincode} in ${selectedAreaMaster?.name}. However, we're expanding! We've saved your details and will notify you when service becomes available in your area.`;
        
        setServiceNotAvailableMessage(message);
        setShowServiceNotAvailableDialog(true);
        
        // Reset form
        setAddressFormState({
          recipientName: "",
          mobile: "",
          plotBuilding: "",
          streetArea: "",
          landmark: "",
          pincode: "",
          city: "Dombivli",
          state: "Maharashtra",
          isDefault: false,
          label: "Home",
        });
        setSelectedAreaMaster(null);
        setShowAddressFormView(false);
      } catch (error) {
        console.error("Failed to save lead:", error);
        toast.error("An error occurred while saving your information. Please try again.");
      }
    } else {
      // Normal address saving flow
      try {
        const newAddress = await post('/delivery-addresses', addressFormState);
        await fetchUserAddresses();
        setSelectedAddressId(newAddress.id);
        setShowAddressFormView(false);
        toast.success("Address added successfully!");
        
        // Reset form
        setAddressFormState({
          recipientName: "",
          mobile: "",
          plotBuilding: "",
          streetArea: "",
          landmark: "",
          pincode: "",
          city: "Dombivli",
          state: "Maharashtra",
          isDefault: false,
          label: "Home",
        });
      } catch (error) {
        console.error("Failed to save address:", error);
        toast.error("An error occurred while saving your address. Please try again.");
      }
    }
  };

  const getBuyOncePrice = () => {
    return product?.depotVariantPricing?.buyOncePrice || product?.price || 0;
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
          sellingPrice: parseFloat(variant.buyOncePrice) || parseFloat(variant.mrp) || 0,
          mrp: parseFloat(variant.mrp) || parseFloat(variant.buyOncePrice) || 0,
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
    // Only fetch user addresses if we have an online depot selected
    if (isOpen && selectedVariantId) {
      const selectedVariant = depotVariants.find(v => v.id === selectedVariantId);
      if (selectedVariant?.depot?.isOnline) {
        fetchUserAddresses();
      }
    }
  }, [isOpen, selectedVariantId, depotVariants]);

  const formatDateForInput = (date: Date | undefined): string => {
    if (!date) return '';
    return format(date, 'yyyy-MM-dd');
  };

  const [useWallet] = useState(true);
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
    if (!selectedDate || !selectedVariantId) {
      toast.error("Please select a delivery date and depot variant.");
      return;
    }

    // Get the selected variant to check if its depot is online
    const selectedVariant = depotVariants.find(v => v.id === selectedVariantId);
    if (!selectedVariant) {
      toast.error("Invalid depot variant selected.");
      return;
    }

    // Determine the correct address ID based on depot type
    const deliveryAddressIdForPayload = selectedVariant.depot.isOnline
      ? selectedAddressId
      : selectedVariant.depot.address;

    // Validate address based on depot type
    if (selectedVariant.depot.isOnline && !selectedAddressId) {
      toast.error("Please select a delivery address.");
      return;
    } else if (!selectedVariant.depot.isOnline && !selectedVariant.depot.address) {
      toast.error("Depot address information is missing. Please contact support.");
      return;
    }

    if (!deliveryAddressIdForPayload) {
      toast.error("Address information is missing.");
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
      deliveryAddressId: parseInt(String(deliveryAddressIdForPayload), 10),
      walletamt: useWallet ? walletDeduction : 0,
      deliveryInstructions: deliveryInstructions.trim() || undefined, // Include delivery instructions
    };

    setIsSubmitting(true);
    try {
      const response = await post('/api/product-orders/with-subscriptions', payload);
      
      // Set success details
      setSuccessDetails({
        orderId: response?.orderId || `ORD-${Date.now()}`,
        totalAmount: productTotal - walletDeduction,
      });
      
      // Show success dialog instead of toast
      setShowSuccessDialog(true);
      onOpenChange(false);
    } catch (error: any) {
      console.error("Failed to place order:", error);
      toast.error(error?.response?.data?.message || "Failed to place order. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
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
                    {mrpPrice && mrpPrice > buyOncePrice ? (
                      <div className="flex items-center justify-center gap-2">
                        <span className="text-sm text-gray-500 line-through font-medium">₹{Number(mrpPrice).toFixed(2)}</span>
                        <span className="text-lg font-bold text-green-600">₹{Number(buyOncePrice || 0).toFixed(2)}</span>
                      </div>
                    ) : (
                      <p className="text-lg font-bold text-green-600">₹{Number(buyOncePrice || 0).toFixed(2)}</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogHeader>

        <div className="p-4 sm:p-6 space-y-4 sm:space-y-6 overflow-y-auto flex-grow pb-8">
          {showAddressFormView ? (
            /* Inline Address Form - matching SubscriptionModal - Made scrollable */
            <div className="bg-white rounded-md">
              <div className="p-4 border-b bg-white sticky top-0 z-10">
                <h3 className="text-lg font-semibold">Add New Address</h3>
              </div>
              <div className="p-4 space-y-5">
                <div>
                  <Label htmlFor="address-label" className="text-sm font-medium mb-2 block">
                    Address Label
                  </Label>
                  <RadioGroup
                    defaultValue="Home"
                    value={addressFormState.label}
                    onValueChange={handleAddressLabelChange}
                    className="flex gap-4 mt-1"
                    id="address-label"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="Home" id="type-home" className="text-green-500" />
                      <Label htmlFor="type-home" className="text-sm">Home</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="Work" id="type-work" className="text-green-500" />
                      <Label htmlFor="type-work" className="text-sm">Work</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="Other" id="label-other" />
                      <Label htmlFor="label-other">Other</Label>
                    </div>
                  </RadioGroup>
                  {formErrors.label && (
                    <p className="text-red-500 text-sm mt-1">{formErrors.label}</p>
                  )}
                </div>
                
                {/* Row 1: Delivery To + Mobile */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="recipientName" className="text-sm font-medium mb-1.5 block">
                      Delivery To*
                    </Label>
                    <input
                      id="recipientName"
                      name="recipientName"
                      value={addressFormState.recipientName}
                      onChange={handleAddressFormChange}
                      placeholder="Full name of recipient"
                      className="w-full h-11 px-3 border border-gray-300 rounded-md bg-white"
                    />
                    {formErrors.recipientName && (
                      <p className="text-red-500 text-sm mt-1">{formErrors.recipientName}</p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="mobile" className="text-sm font-medium mb-1.5 block">
                      Mobile*
                    </Label>
                    <input
                      id="mobile"
                      name="mobile"
                      type="tel"
                      max={10}
                      value={addressFormState.mobile}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, '').slice(0, 10);
                        setAddressFormState(prev => ({
                          ...prev,
                          mobile: value
                        }));
                        
                        // Clear the mobile error when user starts typing/correcting
                        if (formErrors.mobile) {
                          setFormErrors(prev => ({
                            ...prev,
                            mobile: ''
                          }));
                        }
                      }}
                      placeholder="Mobile number"
                      maxLength={10}
                      className="w-full h-11 px-3 border border-gray-300 rounded-md bg-white"
                    />
                    {formErrors.mobile && (
                      <p className="text-red-500 text-sm mt-1">{formErrors.mobile}</p>
                    )}
                  </div>
                </div>
                
                {/* Row 2: Plot/Building + Street/Area + Landmark */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="plotBuilding" className="text-sm font-medium mb-1.5 block">
                      Plot/Building*
                    </Label>
                    <input
                      id="plotBuilding"
                      name="plotBuilding"
                      value={addressFormState.plotBuilding}
                      onChange={handleAddressFormChange}
                      placeholder="Plot number, building name"
                      className="w-full h-11 px-3 border border-gray-300 rounded-md bg-white"
                    />
                    {formErrors.plotBuilding && (
                      <p className="text-red-500 text-sm mt-1">{formErrors.plotBuilding}</p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="streetArea" className="text-sm font-medium mb-1.5 block">
                      Street/Area*
                    </Label>
                    <input
                      id="streetArea"
                      name="streetArea"
                      value={addressFormState.streetArea}
                      onChange={handleAddressFormChange}
                      placeholder="Street, area"
                      className="w-full h-11 px-3 border border-gray-300 rounded-md bg-white"
                    />
                    {formErrors.streetArea && (
                      <p className="text-red-500 text-sm mt-1">{formErrors.streetArea}</p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="landmark" className="text-sm font-medium mb-1.5 block">
                      Nearest Landmark *
                    </Label>
                    <input
                      id="landmark"
                      name="landmark"
                      value={addressFormState.landmark}
                      onChange={handleAddressFormChange}
                      placeholder="Nearby landmark"
                      className="w-full h-11 px-3 border border-gray-300 rounded-md bg-white"
                    />
                  </div>
                </div>
                
                {/* Row 3: Filter by City + Delivery Area */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label
                      htmlFor="deliveryCity"
                      className="text-sm font-medium mb-1.5 block"
                    >
                      City
                    </Label>
                    <Select
                      onValueChange={(value) => {
                        const cityId = value === "dombivli" ? null : parseInt(value);
                        setSelectedCityId(cityId);
                        // Clear area master selection when city changes
                        setSelectedAreaMaster(null);
                        // Clear area master error since selection was reset
                        if (formErrors.areaMaster) {
                          setFormErrors(prev => ({
                            ...prev,
                            areaMaster: ''
                          }));
                        }
                      }}
                      value={selectedCityId?.toString() }
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="city" />
                      </SelectTrigger>
                      <SelectContent className="max-h-60 overflow-y-auto">
                         {cities
                          .sort((a, b) => a.name.localeCompare(b.name))
                          .map((city) => (
                            <SelectItem key={city.id} value={city.id.toString()}>
                              {city.name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="areaMaster" className="text-sm font-medium mb-1.5 block">
                      Delivery Areas* <span className="text-xs text-gray-500"></span>
                      {product?.isDairyProduct && (
                        <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                          Dairy Product
                        </span>
                      )}
                    </Label>
                    <Select
                      onValueChange={(value) => {
                        const areaMaster = filteredAreaMasters.find(am => am.id === parseInt(value));
                        if (areaMaster) {
                          handleAreaMasterSelection(areaMaster);
                        }
                      }}
                      value={selectedAreaMaster?.id?.toString() || ""}
                    >
                      <SelectTrigger className={formErrors.areaMaster ? "border-red-500 w-full" : "w-full"}>
                        <SelectValue placeholder="Select your delivery area" />
                      </SelectTrigger>
                      <SelectContent className="max-h-60 overflow-y-auto">
                        {filteredAreaMasters
                          .sort((a, b) => a.name.localeCompare(b.name))
                          .map((areaMaster) => (
                          <SelectItem
                            key={areaMaster.id}
                            value={areaMaster.id.toString()}
                          >
                            <div className="flex items-center justify-between w-full">
                              <span>{areaMaster.name}</span>
                              <div className="flex gap-1 ml-2">
                               
                               
                              </div>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {formErrors.areaMaster && (
                      <p className="text-red-500 text-sm mt-1">{formErrors.areaMaster}</p>
                    )}
                    {/* {product?.isDairyProduct && (
                      <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded-md">
                        <p className="text-sm text-yellow-700">
                          <span className="font-medium">Dairy Product Notice:</span> This product requires areas that support dairy delivery. Areas marked with "Dairy Available" can serve this product.
                        </p>
                      </div>
                    )} */}
                  </div>
                  <div>
                    <Label
                      htmlFor="state"
                      className="text-sm font-medium mb-1.5 block"
                    >
                      State*
                    </Label>
                    <Select
                      onValueChange={(val) => handleAddressChange("state", val)}
                      value={addressFormState.state}
                      disabled={true}
                    >
                      <SelectTrigger className={formErrors.state ? "border-red-500 w-full" : "w-full"}>
                        <SelectValue placeholder="Select a state" />
                      </SelectTrigger>
                      <SelectContent className="max-h-60 overflow-y-auto">
                        {INDIAN_STATES.filter(st => st && typeof st.label === 'string').map((st) => (
                          <SelectItem key={st.value} value={st.label}>
                            {st.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {formErrors.state && (
                      <p className="text-red-500 text-sm mt-1">{formErrors.state}</p>
                    )}
                  </div>
                </div>
                
                {/* Row 4: State + Pincode */}
                <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
                  
                  <div>
                    <Label htmlFor="pincode" className="text-sm font-medium mb-1.5 block">
                      Pincode*
                    </Label>
                    <input
                      id="pincode"
                      name="pincode"
                      type="text"
                      max={6}
                      value={addressFormState.pincode}
                      onChange={handleAddressFormChange}
                      placeholder="Pincode"
                      className="w-full h-11 px-3 border border-gray-300 rounded-md bg-white"
                    />
                    {formErrors.pincode && (
                      <p className="text-red-500 text-sm mt-1">{formErrors.pincode}</p>
                    )}
                    
                    {/* Pincode Validation */}
                    {selectedAreaMaster && (
                      <PincodeValidator
                        pincode={addressFormState.pincode}
                        isValid={pincodeValidation.isValid}
                        message={pincodeValidation.message}
                        isValidating={pincodeValidation.isValidating}
                        showServiceRequest={!pincodeValidation.isValid && !pincodeValidation.isValidating && addressFormState.pincode.length === 6}
                        onRequestService={handleRequestService}
                      />
                    )}
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="isDefault"
                    name="isDefault"
                    checked={addressFormState.isDefault}
                    onChange={(e) =>
                      setAddressFormState((prev) => ({
                        ...prev,
                        isDefault: e.target.checked,
                      }))
                    }
                    className="h-4 w-4 text-green-500 focus:ring-green-500 border-gray-300 rounded"
                  />
                  <Label htmlFor="isDefault" className="text-sm">
                    Set as default address
                  </Label>
                </div>
                
              </div>
            </div>
          ) : (
            <>
              {/* Date and Address Selection Inputs - These remain as they are */}

              {/* Conditionally render address selection based on selected depot type */}
              {(() => {
                const selectedVariant = depotVariants.find(v => v.id === selectedVariantId);
                const isOnlineDepot = selectedVariant?.depot?.isOnline;

                if (isOnlineDepot) {
                  // Online depot - show delivery address selection
                  return (
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
                        onClick={() => {
                          setShowAddressFormView(true);
                        }}
                      >
                        <Plus className="h-4 w-4 mr-2" /> Add New Address
                      </Button>
                    </div>
                  );
                } else if (selectedVariant) {
                  // Offline depot - show pickup location
                  return (
                    <div>
                      <Label className="text-sm font-medium mb-2 block">Pickup from Location:</Label>
                      <div className="border border-gray-200 rounded-lg p-3 bg-gray-50">
                        <div className="flex items-center gap-2 mb-1">
                          <svg className="h-4 w-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                          </svg>
                          <span className="font-medium">{selectedVariant.depot.name}</span>
                          <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">Pickup</span>
                        </div>
                        {selectedVariant.depot.address ? (
                          <p className="text-sm text-gray-600">
                            {selectedVariant.depot.address}
                            {selectedVariant.depot.city && `, ${selectedVariant.depot.city}`}
                            {selectedVariant.depot.pincode && ` - ${selectedVariant.depot.pincode}`}
                          </p>
                        ) : (
                          <p className="text-sm text-gray-500 italic">Location address information not available</p>
                        )}
                      </div>
                      <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-md">
                        <p className="text-sm text-blue-700 flex items-start">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          You will need to pick up your order from this depot location.
                        </p>
                      </div>
                    </div>
                  );
                } else {
                  // No variant selected yet
                  return (
                    <div>
                      <Label className="text-sm font-medium mb-2 block">Delivery/Pickup Address:</Label>
                      <div className="text-center py-4 border border-dashed border-gray-300 rounded-lg">
                        <p className="text-gray-500">Please select a depot variant first</p>
                      </div>
                    </div>
                  );
                }
              })()}

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
                              </Label>
                              <div className="text-right">
                                {variant.mrp && variant.mrp > variant.buyOncePrice ? (
                                  <div className="flex flex-col items-end gap-0.5">
                                    <span className="text-xs text-gray-500 line-through">
                                      ₹{Number(variant.mrp).toFixed(2)}
                                    </span>
                                    <span className="text-sm font-semibold text-green-600">
                                      ₹{Number(variant.buyOncePrice || 0).toFixed(2)}
                                    </span>
                                  </div>
                                ) : (
                                  <span className="text-sm font-semibold text-green-600">
                                    ₹{Number(variant.buyOncePrice || 0).toFixed(2)}
                                  </span>
                                )}
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

              {/* Delivery Instructions */}
              <div>
                <Label htmlFor="deliveryInstructions" className="text-sm font-medium mb-2 block flex items-center gap-1">
                  <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Delivery Instructions (Optional)
                </Label>
                <textarea
                  id="deliveryInstructions"
                  value={deliveryInstructions}
                  onChange={(e) => setDeliveryInstructions(e.target.value)}
                  placeholder="e.g., Leave at gate, Call before delivery, Ring doorbell twice..."
                  className="w-full p-2 border border-gray-300 rounded-md text-sm resize-none focus:ring-green-500 focus:border-green-500"
                  rows={3}
                  maxLength={200}
                />
                <p className="text-xs text-gray-500 mt-1">
                  {deliveryInstructions.length}/200 characters
                </p>
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
                  1) Since the milk is sourced from 'Tribal farmers',  all payments are in Advance.

2) Both Cash & Online options are available.The plan starts after 2 days from receipt of payment.

3) For Cash payments - our person can visit your home OR you may deposit money at our Tilak Road store.
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
                  <span className="text-sm text-gray-600">{selectedAddressId && userAddresses.find(addr => addr.id === selectedAddressId) ? 'Delivery Address:' : 'Pickup Location:'}</span>
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
                    <span className="text-sm font-medium text-gray-800">{selectedDepot?.address}</span>
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
                <img src={imageurl} alt="" />
              </div>
            </>
          )}
        </div>

        {/* Address Form Footer */}
        {showAddressFormView && (
          <DialogFooter className="p-4 sm:p-6 border-t bg-white">
            <div className="flex justify-end gap-3 w-full">
              <Button
                variant="outline"
                onClick={() => setShowAddressFormView(false)}
                className="rounded-lg h-11 border-gray-300"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveAddress}
                className="bg-primary hover:bg-primary text-white rounded-lg h-11"
                disabled={
                  !!(
                    formErrors.recipientName ||
                    formErrors.mobile ||
                    formErrors.plotBuilding ||
                    formErrors.streetArea ||
                    formErrors.pincode ||
                    formErrors.city ||
                    formErrors.state ||
                    formErrors.label ||
                    formErrors.areaMaster
                  )
                }
              >
                Save Address
              </Button>
            </div>
          </DialogFooter>
        )}

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
                  disabled={isSubmitting || (() => {
                    // Basic validations
                    if (!selectedDate || !selectedVariantId || quantity < 1) return true;
                    
                    // Address validation based on depot type
                    const selectedVariant = depotVariants.find(v => v.id === selectedVariantId);
                    if (!selectedVariant) return true;
                    
                    // For online depots, require delivery address selection
                    if (selectedVariant.depot.isOnline && !selectedAddressId) return true;
                    
                    // For offline depots (store pickup), require depot address to be available
                    if (!selectedVariant.depot.isOnline && !selectedVariant.depot.address) return true;
                    
                    return false;
                  })()}
                  className="flex-1 sm:flex-auto bg-primary hover:bg-primary/80 text-white py-3 text-base font-semibold rounded-lg shadow-md disabled:from-gray-300 disabled:to-gray-400 disabled:shadow-none transition-all duration-200"
                >
                  {isSubmitting ? (
                    <div className="flex items-center justify-center gap-2">
                      <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                      <span>Processing...</span>
                    </div>
                  ) : (
                    <>
                      <span className="hidden sm:inline">Confirm Order & Pay ₹{payableAmount.toFixed(2)}</span>
                      <span className="sm:hidden">Pay ₹{payableAmount.toFixed(2)}</span>
                    </>
                  )}
                </Button>
              </div>
            </div>
          </DialogFooter>
        )}
      </DialogContent>
      
      {/* Service Not Available Dialog */}
      <ServiceNotAvailableDialog
        isOpen={showServiceNotAvailableDialog}
        onOpenChange={setShowServiceNotAvailableDialog}
        productName={product?.name}
        areaName={selectedAreaMaster?.name}
        message={serviceNotAvailableMessage}
      />
      
      {/* Enhanced Lead Capture Modal for unserved pincodes */}
      <EnhancedLeadCaptureModal
        isOpen={showEnhancedLeadModal}
        onOpenChange={setShowEnhancedLeadModal}
        productId={product?.id}
        productName={product?.name}
        isDairyProduct={product?.isDairyProduct}
        message={serviceNotAvailableMessage || `We currently do not serve pincode ${addressFormState.pincode}, but we're expanding!`}
        prefilledData={{
          recipientName: addressFormState.recipientName,
          mobile: addressFormState.mobile,
          plotBuilding: addressFormState.plotBuilding,
          streetArea: addressFormState.streetArea,
          landmark: addressFormState.landmark,
          pincode: addressFormState.pincode,
          city: addressFormState.city || selectedAreaMaster?.city?.name || '',
          state: addressFormState.state
        }}
        onSuccess={() => {
          setShowEnhancedLeadModal(false);
          toast.success("Thank you for your interest! We've saved your details and will contact you when we expand to your area.");
        }}
      />

      {/* Success Dialog */}
      <SuccessDialog
        isOpen={showSuccessDialog}
        onOpenChange={setShowSuccessDialog}
        title="Order Placed Successfully!"
        message="Your subscription has been set up and will start delivering as scheduled."
        orderDetails={{
          orderId: successDetails.orderId,
          productName: product?.name,
          quantity: quantity,
          deliveryDate: selectedDate,
          totalAmount: successDetails.totalAmount,
        }}
      />
    </Dialog>
  );
};
