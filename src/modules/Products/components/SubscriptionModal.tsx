import React, { useState, useEffect, useMemo } from "react";
import { get, post } from "@/services/apiService";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle } from "@/components/ui/dialog";

import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon, Plus, Minus } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { toast } from "sonner"; // Added for toast notifications
// Minimal ProductData interface, expand if more product details are needed in modal
// Ideally, this would be imported from a shared types definition.
interface AddressData {
  id: string;
  recipientName: string;
  mobile: string;
  plotBuilding: string; // equivalent to line1
  streetArea: string;   // equivalent to line2
  landmark?: string;    // optional
  pincode: string;      // equivalent to zip
  city: string;
  state: string;
  isDefault?: boolean;
  label: string;         // Address label (Home, Work, Other)
}

interface ProductData {
  id: number;
  name: string;
  price: number;
  rate: number;
  unit?: string; // Added to display unit with quantity
}

interface SubscriptionModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  product: ProductData | null | undefined; // Product data for display
  productId: string | undefined; // Product ID for subscription payload
  onSubscribeConfirm: (details: { 
    productId: string | undefined;
    quantity: number;
    quantityVarying2?: number; // Optional, only for 'varying' delivery
    deliveryOption: string;
    startDate: Date | undefined;
    selectedAddress: string; // This is the ID of the selected address
    deliveryAddressLabel: string; // Added: Label of the selected address (e.g., Home, Work)
    selectedPeriod: number; 
    selectedDays: string[];
    totalQuantity?: number; // Calculated total quantity based on delivery schedule
    totalAmount?: number; // Calculated total amount based on quantity and price
  }) => void;
}

// Constants moved from ProductDetailPage
const daysOfWeek = [
  { id: "mon", label: "Mon" },
  { id: "tue", label: "Tue" },
  { id: "wed", label: "Wed" },
  { id: "thu", label: "Thu" },
  { id: "fri", label: "Fri" },
  { id: "sat", label: "Sat" },
  { id: "sun", label: "Sun" },
];

const subscriptionPeriods = [
  { value: 7, label: "7 Days" },
  { value: 15, label: "15 Days" },
  { value: 30, label: "1 Month" },
  { value: 90, label: "3 Months" },
];

export const SubscriptionModal: React.FC<SubscriptionModalProps> = ({
  isOpen,
  onOpenChange,
  product,
  productId,
  onSubscribeConfirm,
}) => {
  const [quantity, setQuantity] = useState(1);
  const [quantityVarying2, setQuantityVarying2] = useState(1);
  const [deliveryOption, setDeliveryOption] = useState("daily");
  const [startDate, setStartDate] = useState<Date | undefined>(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow;
  });
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<number>(7); // Changed to number, default 7

  // New state for address management
  const [userAddresses, setUserAddresses] = useState<AddressData[]>([]);
  const [isLoadingAddresses, setIsLoadingAddresses] = useState(false);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [modalView, setModalView] = useState<'subscriptionDetails' | 'addressForm' | 'confirmation'>('subscriptionDetails');
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const handleCancelAddAddress = () => {
    setModalView('subscriptionDetails');
    setAddressFormState({ 
      recipientName: "",
      mobile: "",
      plotBuilding: "",
      streetArea: "",
      landmark: "",
      city: "",
      state: "",
      pincode: "",
      isDefault: false,
      label: "Home" 
    });
    setFormErrors({}); // Clear errors when cancelling
  };

  const validateAddressForm = (): boolean => {
    const errors: Record<string, string> = {};
    if (!addressFormState.recipientName.trim()) errors.recipientName = "Recipient name is required.";
    if (!addressFormState.mobile.trim()) errors.mobile = "Mobile number is required.";
    else if (!/^\d{10}$/.test(addressFormState.mobile.trim())) errors.mobile = "Mobile number must be 10 digits.";
    if (!addressFormState.plotBuilding.trim()) errors.plotBuilding = "Plot/Building is required.";
    if (!addressFormState.streetArea.trim()) errors.streetArea = "Street/Area is required.";
    if (!addressFormState.pincode.trim()) errors.pincode = "Pincode is required.";
    else if (!/^\d{6}$/.test(addressFormState.pincode.trim())) errors.pincode = "Pincode must be 6 digits.";
    if (!addressFormState.city.trim()) errors.city = "City is required.";
    if (!addressFormState.state.trim()) errors.state = "State is required.";
    if (!addressFormState.label.trim()) errors.label = "Address label is required.";
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validateSubscriptionDetails = (): boolean => {
    const errors: Record<string, string> = {};
    if (!startDate) {
      errors.startDate = "Start date is required.";
    } else {
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Compare dates only
      if (startDate < today) {
        errors.startDate = "Start date cannot be in the past.";
      }
    }
    if (deliveryOption === "select-days" && selectedDays.length === 0) {
      errors.selectedDays = "Please select at least one delivery day.";
    }
    if (!selectedAddressId) {
      errors.selectedAddressId = "Please select a delivery address.";
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // New state for address form fields
  const [addressFormState, setAddressFormState] = useState<Omit<AddressData, 'id'>>({
    recipientName: "",
    mobile: "",
    plotBuilding: "",
    streetArea: "",
    landmark: "",
    city: "",
    state: "",
    pincode: "",
    isDefault: false,
    label: "Home", // Default label
  });

  // Use actual API calls for delivery addresses
  const addressService = {
    getUserAddresses: async (): Promise<AddressData[]> => {
      try {
        setIsLoadingAddresses(true);
        // Fetch addresses from API
        const response = await get('/delivery-addresses');
        console.log('Raw API response for addresses:', response);
        
        // Map API response to our AddressData interface
        const mappedAddresses = Array.isArray(response) ? response.map(addr => ({
          id: addr.id.toString(), // Ensure ID is a string for RadioGroup
          recipientName: addr.recipientName || '',
          mobile: addr.mobile || '',
          plotBuilding: addr.plotBuilding || '',
          streetArea: addr.streetArea || '',
          landmark: addr.landmark || '',
          city: addr.city || '',
          state: addr.state || '',
          pincode: addr.pincode || '',
          isDefault: addr.isDefault || false,
          label: addr.label || addr.type || 'Home' // API might send 'label' or 'type'
        })) : [];
        
        console.log('Mapped addresses:', mappedAddresses);
        setUserAddresses(mappedAddresses);
        
        // Select the first address by default if none is selected
        if (mappedAddresses.length > 0 && !selectedAddressId) {
          setSelectedAddressId(mappedAddresses[0].id);
        }
        
        return mappedAddresses;
      } catch (error) {
        console.error('Error fetching addresses:', error);
        return [];
      } finally {
        setIsLoadingAddresses(false);
      }
    },
    createUserAddress: async (address: Omit<AddressData, 'id'>): Promise<AddressData> => {
      try {
        const response = await post('/delivery-addresses', address);
        console.log('Created new address response:', response);
        
        // Map the API response to our AddressData interface
        const mappedAddress: AddressData = {
          id: response.id.toString(),
          recipientName: response.recipientName || '',
          mobile: response.mobile || '',
          plotBuilding: response.plotBuilding || '',
          streetArea: response.streetArea || '',
          landmark: response.landmark || '',
          city: response.city || '',
          state: response.state || '',
          pincode: response.pincode || '',
          isDefault: response.isDefault || false,
          label: response.label || response.type || address.label || 'Home' // API might send 'label' or 'type', fallback to form's label
        };
        
        console.log('Mapped new address:', mappedAddress);
        setUserAddresses(prev => [...prev, mappedAddress]);
        setSelectedAddressId(mappedAddress.id);
        return mappedAddress;
      } catch (error) {
        console.error('Error creating address:', error);
        throw error;
      }
    }
  };

  useEffect(() => {
    if (isOpen && modalView === 'subscriptionDetails') {
      console.log('Modal opened, fetching addresses...');
      addressService.getUserAddresses()
        .then(addresses => {
          console.log('Addresses loaded successfully:', addresses);
          // Explicitly log the IDs of loaded addresses
          if (addresses.length > 0) {
            console.log('Available address IDs:', addresses.map(a => `${a.id} (${typeof a.id})`))
            // Set the first address as selected if none is selected
            if (!selectedAddressId && addresses.length > 0) {
              console.log('Setting default address ID:', addresses[0].id);
              setSelectedAddressId(addresses[0].id);
            }
          } else {
            console.log('No addresses available');
          }
        })
        .catch(err => console.error('Error loading addresses:', err));
    }
    if (!isOpen) { // Reset view when modal closes
        setModalView('subscriptionDetails');
    }
  }, [isOpen, modalView]);

  const handleAddressFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setAddressFormState(prev => ({ ...prev, [name]: value }));
    // Clear specific error when user types
    if (formErrors[name]) {
      setFormErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleAddressLabelChange = (value: string) => {
    setAddressFormState(prev => ({ ...prev, label: value }));
    if (formErrors.label) {
      setFormErrors(prev => ({ ...prev, label: '' }));
    }
  };

  const handleSaveAddress = async () => {
    if (!validateAddressForm()) return;
    const addressToCreate = {
      ...addressFormState,
    };

    try {
      await addressService.createUserAddress(addressToCreate);
      toast.success("Address saved successfully!"); // Success toast
      setModalView('subscriptionDetails');
      // Reset form for next time
      setAddressFormState({ 
        recipientName: "",
        mobile: "",
        plotBuilding: "",
        streetArea: "",
        landmark: "",
        city: "",
        state: "",
        pincode: "",
        isDefault: false,
        label: "Home"
      });
    } catch (error) {
      console.error("Failed to save address:", error);
      let errorMessage = "An error occurred while saving your address. Please try again.";
      // You could try to parse a more specific error message if your API returns one
      // if (error && error.response && error.response.data && error.response.data.message) {
      //   errorMessage = error.response.data.message;
      // }
      toast.error(errorMessage);
    }
  };

  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  // Removed redundant addressFormErrors, using formErrors for all form validations

  const toggleDaySelection = (dayId: string) => {
    if (selectedDays.includes(dayId)) {
      setSelectedDays(selectedDays.filter(day => day !== dayId));
    } else {
      setSelectedDays([...selectedDays, dayId]);
    }
  };

  const handleProceedToConfirmation = () => { 
    if (!selectedAddressId) {
      console.error("No address selected. Please select or add an address.");
      toast.error("Please select a delivery address");
      return;
    }
    
    // Move to confirmation view
    setModalView('confirmation');
  };
  
  const handleConfirmSubscription = () => {
    if (!validateSubscriptionDetails()) return;

    if (!product || !productId || !selectedAddressId || !startDate) { // selectedAddressId already validated by validateSubscriptionDetails
      toast.error("Missing product details or critical information."); // Simplified error
      return;
    }

    // Get the selected address details
    const selectedFullAddress = userAddresses.find(addr => addr.id === selectedAddressId);
    const currentDeliveryAddressLabel = selectedFullAddress?.label || "Home"; // Default to Home if not found
    
    // Create a date with time set to noon to avoid timezone issues
    const normalizedDate = startDate ? new Date(startDate) : new Date();
    normalizedDate.setHours(12, 0, 0, 0); // Set to noon to avoid any date shifting due to timezone

    // Get calculated values from subscription summary
    const totalQuantity = subscriptionSummary?.totalQuantity || 0;
    const totalAmount = subscriptionSummary?.totalPrice || 0;

    // Include the calculated values in the subscription data
    onSubscribeConfirm({
      productId,
      quantity,
      ...(deliveryOption === "varying" && { quantityVarying2 }),
      deliveryOption,
      startDate: normalizedDate,
      selectedAddress: selectedAddressId!, 
      deliveryAddressLabel: currentDeliveryAddressLabel,
      selectedPeriod,
      selectedDays,
      // Add the calculated totals
      totalQuantity,
      totalAmount
    });
    
    onOpenChange(false); // Close modal after confirming
  };

  const subscriptionSummary = useMemo(() => {
    if (!product) return null;
    
    let deliveryCount = 0;
    let totalQuantity = 0;
    let deliveryDescription = "";

    switch (deliveryOption) {
      case "daily":
        deliveryCount = selectedPeriod;
        totalQuantity = quantity * deliveryCount;
        deliveryDescription = `Daily delivery of ${quantity} item${quantity > 1 ? 's' : ''}`;
        break;
        
      case "select-days":
        if (selectedDays.length === 0) {
          deliveryCount = 0;
          totalQuantity = 0;
          deliveryDescription = "No days selected";
        } else {
          // Get day numbers (0-6, where 0 is Sunday) for selected days
          const selectedDayNumbers = selectedDays.map(day => {
            switch(day) {
              case "mon": return 1;
              case "tue": return 2;
              case "wed": return 3;
              case "thu": return 4;
              case "fri": return 5;
              case "sat": return 6;
              case "sun": return 0;
              default: return -1;
            }
          }).filter(day => day >= 0);
          
          // Calculate actual delivery days based on start date
          deliveryCount = 0;
          if (startDate) {
            const startDateCopy = new Date(startDate);
            const endDate = new Date(startDate);
            endDate.setDate(endDate.getDate() + selectedPeriod - 1);
            
            for (let d = new Date(startDateCopy); d <= endDate; d.setDate(d.getDate() + 1)) {
              // getDay returns 0-6, check if it's in our selected days array
              const dayNumber = d.getDay();
              if (selectedDayNumbers.includes(dayNumber as 0 | 1 | 2 | 3 | 4 | 5 | 6)) {
                deliveryCount++;
              }
            }
          }
          
          totalQuantity = quantity * deliveryCount;
          const dayLabels = daysOfWeek
            .filter(day => selectedDays.includes(day.id))
            .map(day => day.label);
          deliveryDescription = `On ${dayLabels.join(', ') || 'selected days'}`;
        }
        break;
        
      case "varying":
        deliveryCount = selectedPeriod;
        const days1 = Math.ceil(selectedPeriod / 2);
        const days2 = Math.floor(selectedPeriod / 2);
        totalQuantity = (quantity * days1) + (quantityVarying2 * days2);
        deliveryDescription = `Alternate: ${quantity} & ${quantityVarying2} Qty`;
        break;
    }

    const totalPrice = product.rate * totalQuantity;
    
    return {
      deliveryCount,
      totalQuantity,
      deliveryDescription,
      totalPrice,
      period: subscriptionPeriods.find(p => p.value === selectedPeriod)?.label || `${selectedPeriod} days`,
      startDate: startDate ? format(startDate, "MMM dd, yyyy") : "Not set"
    };
  }, [product, deliveryOption, selectedPeriod, quantity, quantityVarying2, selectedDays, startDate]);

  if (!product) return null; // Don't render modal content if no product data
 return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => { 
        onOpenChange(open); 
        if (!open) setModalView('subscriptionDetails');
      }}
    >
      <DialogContent
        className="max-sm:max-w-md flex flex-col max-h-[90vh] p-0 bg-white min-w-[50%] rounded-xl overflow-hidden"
        onPointerDownOutside={(event) => {
          const target = event.target as HTMLElement;
          // Check if the click originated from within the PopoverContent (data-radix-popover-content)
          // or specifically from within the react-day-picker calendar (.rdp) or any calendar button
          if (target.closest('[data-radix-popover-content]') || 
              target.closest('.rdp') || 
              target.closest('.calendar-day') || 
              target.closest('[role="gridcell"]')) {
            event.preventDefault();
          }
        }}
      >
        <DialogHeader className="p-5 border-b">
          <div className="flex justify-between items-center">
            <DialogTitle className="text-xl font-semibold text-gray-800">
              Subscribe to {product?.name}
            </DialogTitle>
            <div className="flex items-center gap-1">
              <span className="text-sm text-gray-500">Price:</span>
              <p className="text-lg font-bold">₹{product?.rate}</p>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-grow overflow-y-auto px-5 py-4 space-y-6 bg-gray-50">
          {/* Main content views */}
          {modalView === 'subscriptionDetails' ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Left Column */}
                <div className="space-y-6">
                  {/* Subscription Period */}
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-3">Subscription Period</h3>
                    <div className="grid grid-cols-2 gap-3">
                      {subscriptionPeriods.map((period) => (
                        <Button
                          key={period.value}
                          variant={selectedPeriod === period.value ? "default" : "outline"}
                          className={`h-10 ${selectedPeriod === period.value ? 'bg-green-500 hover:bg-green-600' : 'border-gray-300'}`}
                          onClick={() => setSelectedPeriod(period.value)}
                        >
                          {period.label}
                        </Button>
                      ))}
                    </div>
                  </div>

                  {/* Delivery Options */}
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-3">Delivery Schedule</h3>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { value: "daily", label: "Daily" },
                        { value: "select-days", label: "Select Days" },
                        { value: "varying", label: "Alternate Days" }
                      ].map((option) => (
                        <Button
                          key={option.value}
                          variant={deliveryOption === option.value ? "default" : "outline"}
                          className={`h-9 text-xs ${deliveryOption === option.value ? 'bg-blue-500 hover:bg-blue-600' : 'border-gray-300'}`}
                          onClick={() => setDeliveryOption(option.value)}
                        >
                          {option.label}
                        </Button>
                      ))}
                    </div>

                    {/* Conditional UI for each option */}
                    {deliveryOption === "select-days" && (
                      <div className="mt-4 p-3 rounded-md bg-white border border-gray-200">
                        <h4 className="text-xs font-medium text-gray-600 mb-2">Select delivery days:</h4>
                        <div className="flex flex-wrap gap-2">
                          {daysOfWeek.map(day => (
                            <Button
                              key={day.id}
                              type="button"
                              size="sm"
                              variant={selectedDays.includes(day.id) ? "default" : "outline"}
                              className={`h-8 w-9 p-0 ${selectedDays.includes(day.id) ? "bg-orange-500" : "border-gray-300 text-gray-700"}`}
                              onClick={() => {
                                toggleDaySelection(day.id);
                                if (formErrors.selectedDays) setFormErrors(prev => ({...prev, selectedDays: ''}));
                              }}
                            >
                              {day.label}
                            </Button>
                          ))}
                        </div>
                        {formErrors.selectedDays && <p className="text-red-500 text-xs mt-1">{formErrors.selectedDays}</p>}
                      </div>
                    )}

                    {/* Quantity selectors */}
                    <div className="mt-4">
                      {(deliveryOption === "daily" || deliveryOption === "select-days") && (
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-gray-700">Quantity per delivery:</span>
                          <div className="flex items-center border rounded-lg overflow-hidden bg-white w-28">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => setQuantity(Math.max(1, quantity - 1))} 
                              className="h-9 w-9 p-0 hover:bg-gray-100"
                            >
                              <Minus className="h-4 w-4" />
                            </Button>
                            <span className="flex-1 text-center font-medium">{quantity}</span>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => setQuantity(quantity + 1)} 
                              className="h-9 w-9 p-0 hover:bg-gray-100"
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      )}

                      {deliveryOption === "varying" && (
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-gray-700">Quantity A:</span>
                            <div className="flex items-center border rounded-lg overflow-hidden bg-white w-28">
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => setQuantity(Math.max(1, quantity - 1))} 
                                className="h-9 w-9 p-0 hover:bg-gray-100"
                              >
                                <Minus className="h-4 w-4" />
                              </Button>
                              <span className="flex-1 text-center font-medium">{quantity}</span>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => setQuantity(quantity + 1)} 
                                className="h-9 w-9 p-0 hover:bg-gray-100"
                              >
                                <Plus className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-gray-700">Quantity B:</span>
                            <div className="flex items-center border rounded-lg overflow-hidden bg-white w-28">
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => setQuantityVarying2(Math.max(1, quantityVarying2 - 1))} 
                                className="h-9 w-9 p-0 hover:bg-gray-100"
                              >
                                <Minus className="h-4 w-4" />
                              </Button>
                              <span className="flex-1 text-center font-medium">{quantityVarying2}</span>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => setQuantityVarying2(quantityVarying2 + 1)} 
                                className="h-9 w-9 p-0 hover:bg-gray-100"
                              >
                                <Plus className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Start Date */}
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-2">Start Date</h3>
                    <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "w-full justify-start text-left font-normal border-gray-300 rounded-md",
                            !startDate && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {startDate ? format(startDate, "dd/MM/yyyy") : <span>Pick a date</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent 
                        className="w-auto p-0 pointer-events-auto" 
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Calendar 
                          mode="single" 
                          selected={startDate} 
                          onSelect={(date) => {
                            setStartDate(date);
                            setCalendarOpen(false);
                            if (formErrors.startDate) setFormErrors(prev => ({...prev, startDate: ''}));
                          }}
                          initialFocus
                          disabled={(date) => date < new Date(new Date().setDate(new Date().getDate() -1)) } // Disable past dates
                        />
                      </PopoverContent>
                    </Popover>
                    {formErrors.startDate && <p className="text-red-500 text-xs mt-1">{formErrors.startDate}</p>}
                  </div>
                </div>

                {/* Right Column - Address Section */}
                <div className="space-y-6">
                  <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-center mb-3">
                      <h3 className="text-sm font-medium text-gray-700">Delivery Address</h3>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => setModalView('addressForm')}
                        className="text-xs h-8"
                      >
                        <Plus className="h-3 w-3 mr-1" /> Add New
                      </Button>
                    </div>

                    {isLoadingAddresses ? (
                      <div className="flex items-center justify-center py-6">
                        <span className="text-gray-500 text-sm">Loading Delivery addresses...</span>
                      </div>
                    ) : userAddresses.length > 0 ? (
                      <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
                        <RadioGroup
                          value={selectedAddressId || ''}
                          onValueChange={(id: string) => {
                            setSelectedAddressId(id);
                            if (formErrors.selectedAddressId) setFormErrors(prev => ({ ...prev, selectedAddressId: '' }));
                          }}
                          className="space-y-3"
                        >
                          {userAddresses.map((address) => (
                            <div key={address.id} className={`p-3 border rounded-lg cursor-pointer transition-all ${selectedAddressId === address.id ? 'border-green-500 bg-green-50' : 'border-gray-200 hover:bg-gray-50'}`}>
                              <Label htmlFor={`address-item-${address.id}`} className="flex items-start space-x-3 w-full">
                                <RadioGroupItem value={address.id} id={`address-item-${address.id}`} className="mt-1" />
                                <div className="flex-1">
                                  <div className="flex justify-between">
                                    <span className="font-medium text-gray-900">{address.recipientName}</span>
                                    <Badge variant="outline">{address.label}</Badge>
                                  </div>
                                  <p className="text-xs text-gray-600 mt-1">
                                    {address.plotBuilding}, {address.streetArea}
                                  </p>
                                  <p className="text-xs text-gray-600">
                                    {address.city}, {address.state} - {address.pincode}
                                  </p>
                                  {address.isDefault && (
                                    <span className="inline-block mt-2 px-2 py-0.5 bg-blue-100 text-blue-800 text-xs rounded">
                                      Default
                                    </span>
                                  )}
                                </div>
                              </Label>
                            </div>
                          ))}
                        </RadioGroup>
                      </div>
                    ) : (
                      <div className="text-center py-6">
                        <p className="text-gray-500 text-sm mb-3">No addresses saved</p>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => setModalView('addressForm')}
                        >
                          <Plus className="h-3 w-3 mr-1" /> Add Delivery Address
                        </Button>
                      </div>
                    )}
                  </div>
                  
                  {/* Summary Section */}
                  {subscriptionSummary && (
                    <div className="bg-white border border-gray-200 rounded-lg p-4">
                      <h3 className="text-sm font-medium text-gray-700 mb-3">Order Summary</h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Period:</span>
                          <span>{subscriptionSummary.period}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Schedule:</span>
                          <span className="text-right">{subscriptionSummary.deliveryDescription}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Start Date:</span>
                          <span>{format(subscriptionSummary.startDate, "dd/MM/yyyy")}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Total Deliveries:</span>
                          <span>{subscriptionSummary.deliveryCount}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Total Quantity:</span>
                          <span>{subscriptionSummary.totalQuantity} {product?.unit || ''}</span>
                        </div>
                        <div className="flex justify-between items-center mt-2 pt-2 border-t border-gray-200">
                          <span className="text-sm font-medium text-gray-600">Calculation:</span>
                          <span className="text-sm font-medium text-green-600">
                            {subscriptionSummary?.totalQuantity || quantity} {product?.unit || ''} * ₹{product?.rate?.toFixed(2)} = ₹{((subscriptionSummary?.totalQuantity || quantity) * (product?.rate || 0)).toFixed(2)}
                          </span>
                        </div>
                        <div className="border-t border-gray-200 pt-2 mt-2">
                          <div className="flex justify-between font-medium">
                            <span>Total Price:</span>
                            <span className="text-green-600">₹{subscriptionSummary.totalPrice}</span>
                          </div>
                        </div>
                      
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : modalView === 'confirmation' ? (
            <div className="bg-white p-4 rounded-md space-y-4">
              <h3 className="text-lg font-semibold text-center">Confirm Your Subscription</h3>
              
              <div className="border rounded-lg p-4 bg-gray-50 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Product:</span>
                  <span className="font-semibold">{product.name}</span>
                </div>
              
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Period:</span>
                  <span>{subscriptionSummary?.period}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Delivery:</span>
                  <span>{subscriptionSummary?.deliveryDescription}</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Start Date:</span>
                  <span>{subscriptionSummary?.startDate}</span>
                </div>
                
                {/* <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Delivery Count:</span>
                  <span>{subscriptionSummary?.deliveryCount} deliveries</span>
                </div> */}
                
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Total Quantity:</span>
                  <span>{subscriptionSummary?.totalQuantity} {product?.unit || ''}</span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t">
                  <span className="text-sm font-medium">Calculation:</span>
                  <span className="text-sm font-medium text-green-600">
                    {subscriptionSummary?.totalQuantity || quantity} {product?.unit || ''} * ₹{product?.rate?.toFixed(2)} = ₹{((subscriptionSummary?.totalQuantity || quantity) * (product?.rate || 0)).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t">
                  <span className="text-sm font-semibold">Total Amount:</span>
                  <span className="text-lg font-bold text-green-600">₹{subscriptionSummary?.totalPrice}</span>
                </div>
              </div>
              
              <div className="bg-white p-4 rounded-md border">
                <h4 className="text-sm font-medium mb-2">Delivery Address:</h4>
                {userAddresses.map(address => {
                  if (address.id === selectedAddressId) {
                    return (
                      <div key={address.id} className="text-sm">
                        <Badge variant="outline" className="mt-1">{address.label}</Badge>
                        <p><span className="font-medium">{address.recipientName}</span> • {address.mobile}</p>
                        <p>{address.plotBuilding}, {address.streetArea}</p>
                        {address.landmark && <p>{address.landmark}</p>}
                        <p>{address.city}, {address.state} - {address.pincode}</p>
                       </div>
                    );
                  }
                  return null;
                })}
              </div>
              
              {/* <div className="flex gap-3 pt-2">
                <Button 
                  variant="outline" 
                  className="flex-1" 
                  onClick={() => setModalView('subscriptionDetails')}
                >
                  Back
                </Button>
                <Button 
                  className="bg-green-500 hover:bg-green-600 text-white rounded-lg h-11 "
                  onClick={handleConfirmSubscription}
                >
                  Confirm Subscription
                </Button>
              </div> */}
            </div>
          ) : (
            // Address Form View (remains largely the same with minor UI tweaks)
            <div className="bg-white p-4 rounded-md space-y-4">
              <h3 className="text-lg font-semibold">Add New Address</h3>
                <div className="space-y-5">
                             <div>
                              <Label htmlFor="address-label" className="text-sm font-medium mb-2 block">Address Label</Label>
                              <RadioGroup defaultValue="Home" value={addressFormState.label} onValueChange={handleAddressLabelChange} className="flex gap-4 mt-1" id="address-label">
                                <div className="flex items-center space-x-2"><RadioGroupItem value="Home" id="type-home" className="text-green-500"/><Label htmlFor="type-home" className="text-sm">Home</Label></div>
                                <div className="flex items-center space-x-2"><RadioGroupItem value="Work" id="type-work" className="text-green-500"/><Label htmlFor="type-work" className="text-sm">Work</Label></div>
                                <div className="flex items-center space-x-2"><RadioGroupItem value="Other" id="label-other" />
            <Label htmlFor="label-other">Other</Label>
          </div>
        </RadioGroup>
        {formErrors.label && <p className="text-red-500 text-xs mt-1">{formErrors.label}</p>}
                            </div>
                            <div>
                              <Label htmlFor="recipientName" className="text-sm font-medium mb-1.5 block">Delivery To*</Label>
                              <Input id="recipientName" name="recipientName" value={addressFormState.recipientName} onChange={handleAddressFormChange} placeholder="Full name of recipient" className="h-11 bg-white" />
                              {formErrors.recipientName && <p className="text-red-500 text-xs mt-1">{formErrors.recipientName}</p>}
                            </div>
                            <div>
                              <Label htmlFor="mobile" className="text-sm font-medium mb-1.5 block">Mobile*</Label>
                              <Input id="mobile" name="mobile" value={addressFormState.mobile} onChange={handleAddressFormChange} placeholder="Mobile number" className="h-11 bg-white" />
        {formErrors.mobile && <p className="text-red-500 text-xs mt-1">{formErrors.mobile}</p>}
                            </div>
                            <div>
                              <Label htmlFor="plotBuilding" className="text-sm font-medium mb-1.5 block">Plot/Building*</Label>
                              <Input id="plotBuilding" name="plotBuilding" value={addressFormState.plotBuilding} onChange={handleAddressFormChange} placeholder="Plot number, building name" className="h-11 bg-white" />
                              {formErrors.plotBuilding && <p className="text-red-500 text-xs mt-1">{formErrors.plotBuilding}</p>}
                            </div>
                            <div>
                              <Label htmlFor="streetArea" className="text-sm font-medium mb-1.5 block">Street/Area*</Label>
                              <Input id="streetArea" name="streetArea" value={addressFormState.streetArea} onChange={handleAddressFormChange} placeholder="Street, area" className="h-11 bg-white"/>
                              {formErrors.streetArea && <p className="text-red-500 text-xs mt-1">{formErrors.streetArea}</p>}
                            </div>
                            <div>
                              <Label htmlFor="landmark" className="text-sm font-medium mb-1.5 block">Landmark (Optional)</Label>
                              <Input id="landmark" name="landmark" value={addressFormState.landmark} onChange={handleAddressFormChange} placeholder="Nearby landmark" className="h-11 bg-white"/>
        {/* Landmark is optional, so no error display needed unless explicitly required */}
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <Label htmlFor="city" className="text-sm font-medium mb-1.5 block">City*</Label>
                                <Input id="city" name="city" value={addressFormState.city} onChange={handleAddressFormChange} placeholder="City" className="h-11 bg-white" />
                                {formErrors.city && <p className="text-red-500 text-xs mt-1">{formErrors.city}</p>}
                              </div>
                              <div>
                                <Label htmlFor="state" className="text-sm font-medium mb-1.5 block">State*</Label>
                                <Input id="state" name="state" value={addressFormState.state} onChange={handleAddressFormChange} placeholder="State" className="h-11 bg-white" />
                                {formErrors.state && <p className="text-red-500 text-xs mt-1">{formErrors.state}</p>}
                              </div>
                            </div>
                            <div>
                              <Label htmlFor="pincode" className="text-sm font-medium mb-1.5 block">Pincode*</Label>
                              <Input id="pincode" name="pincode" type="text" value={addressFormState.pincode} onChange={handleAddressFormChange} placeholder="Pincode" className="h-11 bg-white" />
                              {formErrors.pincode && <p className="text-red-500 text-xs mt-1">{formErrors.pincode}</p>}
                            </div>
                            <div className="flex items-center space-x-2">
                              <input 
                                type="checkbox" 
                                id="isDefault" 
                                name="isDefault" 
                                checked={addressFormState.isDefault} 
                                onChange={(e) => setAddressFormState(prev => ({ ...prev, isDefault: e.target.checked }))}
                                className="h-4 w-4 text-green-500 focus:ring-green-500 border-gray-300 rounded"
                              />
                              <Label htmlFor="isDefault" className="text-sm">Set as default address</Label>
                            </div>
                          </div>
            </div>
          )}
        </div>

        <DialogFooter className="p-4 border-t bg-white">
          {modalView === 'subscriptionDetails' ? (
            <Button 
              onClick={handleProceedToConfirmation} 
              disabled={isLoadingAddresses}
              className="w-full bg-green-500 hover:bg-green-600 text-white py-2 rounded-md font-medium"
            >
              Review Subscription
            </Button>
          ) : modalView === 'addressForm' ? (
            <div className="flex justify-end gap-3 w-full">
              <Button 
                variant="outline" 
                onClick={handleCancelAddAddress} 
                className="rounded-lg h-11 border-gray-300"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleSaveAddress} 
                className="bg-green-500 hover:bg-green-600 text-white rounded-lg h-11 "
                disabled={!!(formErrors.recipientName || formErrors.mobile || formErrors.plotBuilding || formErrors.streetArea || formErrors.pincode || formErrors.city || formErrors.state || formErrors.label)}
              >
                Save Address
              </Button>
            </div>
          ) : (
            <div className="flex justify-end items-center gap-3 w-full">
              <Button 
                variant="outline" 
                className="rounded-lg h-11 border-gray-300"
                onClick={() => setModalView('subscriptionDetails')}
              >
                Back
              </Button>
             
              <Button 
                className="bg-green-500 hover:bg-green-600 text-white rounded-lg h-11 "
                onClick={handleConfirmSubscription}
                disabled={!!(formErrors.startDate || formErrors.selectedDays || formErrors.selectedAddressId)}
              >
                Confirm Subscription
              </Button>
            </div>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
