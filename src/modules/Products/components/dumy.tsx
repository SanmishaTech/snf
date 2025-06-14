import React, { useState, useEffect } from "react";
import { get, post } from "@/services/apiService";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle } from "@/components/ui/dialog";
import { useRef } from "react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon, Plus, Minus, ChevronLeft, ChevronRight } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format, getMonth, getYear } from "date-fns";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
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
  const [startDate, setStartDate] = useState<Date | undefined>(new Date());
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<number>(7); // Changed to number, default 7

  // New state for address management
  const [userAddresses, setUserAddresses] = useState<AddressData[]>([]);
  const [isLoadingAddresses, setIsLoadingAddresses] = useState(false);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [modalView, setModalView] = useState<'subscriptionDetails' | 'addressForm'>('subscriptionDetails');

  const handleCancelAddAddress = () => {
    setModalView('subscriptionDetails');
    // Reset form for next time, ensure all fields are cleared
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

  const handleAddressFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setAddressFormState(prev => ({ ...prev, [name]: value }));
  };

  const handleAddressLabelChange = (value: string) => {
    setAddressFormState(prev => ({ ...prev, label: value }));
  };

  const handleSaveAddress = async () => {
    // Basic validation (can be expanded)
    if (!addressFormState.recipientName || !addressFormState.mobile || !addressFormState.plotBuilding || 
        !addressFormState.streetArea || !addressFormState.city || !addressFormState.state || !addressFormState.pincode) {
      alert("Please fill all required address fields.");
      return;
    }
    // Map our form fields to backend expected format
    const addressToCreate = {
      ...addressFormState,
      // Any additional mappings if needed
    };
    await addressService.createUserAddress(addressToCreate);
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
  };

  const [selectedDays, setSelectedDays] = useState<string[]>([]);

  const toggleDaySelection = (dayId: string) => {
    if (selectedDays.includes(dayId)) {
      setSelectedDays(selectedDays.filter(day => day !== dayId));
    } else {
      setSelectedDays([...selectedDays, dayId]);
    }
  };


  const handleInternalAddItem = () => { 
    if (!selectedAddressId) {
      console.error("No address selected. Please select or add an address.");
      // TODO: Show a user-friendly error message in the UI (e.g., a toast or an alert within the modal)
      return;
    }

    // Call onSubscribeConfirm with the correctly structured details
  // 'selectedAddress' in the props means the ID of the address (string)
  // 'productId' and 'onSubscribeConfirm' are props of SubscriptionModal
    const selectedFullAddress = userAddresses.find(addr => addr.id === selectedAddressId);
    const currentDeliveryAddressLabel = selectedFullAddress?.label || "Home"; // Default to Home if not found, though it should be

    // Create a date with time set to noon to avoid timezone issues
    const normalizedDate = startDate ? new Date(startDate) : new Date();
    normalizedDate.setHours(12, 0, 0, 0); // Set to noon to avoid any date shifting due to timezone

    onSubscribeConfirm({
      productId,
      quantity,
      ...(deliveryOption === "varying" && { quantityVarying2 }),
      deliveryOption,
      startDate: normalizedDate,
      selectedAddress: selectedAddressId!, 
      deliveryAddressLabel: currentDeliveryAddressLabel,
      selectedPeriod,
      selectedDays
    });
    
    onOpenChange(false); // Close modal after confirming
  };

  if (!product) return null; // Don't render modal content if no product data

  return (
    <Dialog
     open={isOpen} onOpenChange={(open) => { 
      onOpenChange(open); 
      if (!open) { 
        setModalView('subscriptionDetails'); 
        // Optionally reset other states like quantity, selectedDays etc. if needed when modal closes
      }
    }}>
      <DialogContent className="max-sm:max-w-md flex flex-col max-h-[95vh] p-0 bg-gray-50 min-w-[50%]">
        <DialogHeader className="p-5 border-b sticky top-0 bg-white z-10">
          <div className="flex justify-between items-start">
            <DialogTitle className="text-2xl font-medium">{product?.name}</DialogTitle>
            <div className="text-right ml-4 flex items-center gap-2">
              <p className="text-sm text-gray-500">MRP:</p>
              <p className="text-lg font-bold">₹{product?.price}</p>
            </div>
          </div>
          {/* <DialogClose 
            className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground"
            onClick={() => { onOpenChange(false); setModalView('subscriptionDetails'); }}
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </DialogClose> */}
        </DialogHeader>

        <div className="flex-grow overflow-y-auto px-5 py-4 space-y-7 bg-gray-50">
          {/* Main content: Subscription details or Address form */}
          {modalView === 'subscriptionDetails' ? (
            // Subscription Details View
            <div className="space-y-6">
              <div>
                <Label htmlFor="subscription-period-modal" className="text-sm font-medium mb-2 block">Subscription Period</Label>
                <RadioGroup value={String(selectedPeriod)} onValueChange={(value) => setSelectedPeriod(Number(value))} className="flex flex-wrap gap-3 mt-2" id="subscription-period-modal">
                  {subscriptionPeriods.map((period) => (
                    <div key={period.value} className="flex items-center space-x-2">
                      <RadioGroupItem value={String(period.value)} id={`modal-period-${period.value}`} className="text-orange-500" />
                      <Label htmlFor={`modal-period-${period.value}`}>{period.label}</Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>

              <div> {/* Delivery Options Radio & Conditional UI */}
                <RadioGroup defaultValue="daily" value={deliveryOption} onValueChange={setDeliveryOption} className="flex flex-wrap gap-4">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="daily" id="modal-daily" className="text-green-500" />
                    <Label htmlFor="modal-daily" className="text-sm">Daily</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="select-days" id="modal-select-days" className="text-green-500" />
                    <Label htmlFor="modal-select-days" className="text-sm">Select days</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="varying" id="modal-varying" className="text-green-500" />
                    <Label htmlFor="modal-varying" className="text-sm">Varying</Label>
                  </div>
                </RadioGroup>

                {deliveryOption === "select-days" && (
                  <div className="mt-3 border p-3 rounded-md bg-gray-50">
                    <p className="text-sm font-medium mb-2">Select days of the week:</p>
                    <div className="flex flex-wrap gap-2">
                      {daysOfWeek.map(day => (
                        <Button
                          key={day.id}
                          type="button"
                          size="sm"
                          variant={selectedDays.includes(day.id) ? "default" : "outline"}
                          className={`min-w-[40px] h-8 p-0 ${selectedDays.includes(day.id) ? "bg-orange-500 hover:bg-orange-600" : "border-orange-300 text-orange-600 hover:bg-orange-50"}`}
                          onClick={() => toggleDaySelection(day.id)}
                        >
                          {day.label}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}

                {(deliveryOption === "daily" || deliveryOption === "select-days" || deliveryOption === "alternate") && (
                  <div className="flex justify-between items-center mt-5">
                    <span className="text-sm font-medium">Quantity:</span>
                    <div className="flex items-center border rounded-md overflow-hidden bg-white">
                      <Button variant="ghost" size="sm" onClick={() => setQuantity(Math.max(1, quantity - 1))} className="h-9 w-9 p-0 flex items-center justify-center rounded-none hover:bg-gray-100">
                        <Minus className="h-4 w-4" />
                      </Button>
                      <span className="px-5 font-medium">{quantity}</span>
                      <Button variant="ghost" size="sm" onClick={() => setQuantity(quantity + 1)} className="h-9 w-9 p-0 flex items-center justify-center rounded-none hover:bg-gray-100">
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}

                {deliveryOption === "varying" && (
                  <div className="mt-3 border p-3 rounded-md bg-gray-50">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Quantity 1:</span>
                        <div className="flex items-center border rounded-full overflow-hidden">
                          <Button variant="ghost" size="sm" onClick={() => setQuantity(Math.max(1, quantity - 1))} className="h-full px-2 rounded-none hover:bg-gray-100">
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="px-3">{quantity}</span>
                          <Button variant="ghost" size="sm" onClick={() => setQuantity(quantity + 1)} className="h-full px-2 rounded-none hover:bg-gray-100">
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Quantity 2:</span>
                        <div className="flex items-center border rounded-full overflow-hidden">
                          <Button variant="ghost" size="sm" onClick={() => setQuantityVarying2(Math.max(1, quantityVarying2 - 1))} className="h-full px-2 rounded-none hover:bg-gray-100">
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="px-3">{quantityVarying2}</span>
                          <Button variant="ghost" size="sm" onClick={() => setQuantityVarying2(quantityVarying2 + 1)} className="h-full px-2 rounded-none hover:bg-gray-100">
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="text-sm text-gray-700"> {/* Delivery Option Descriptions */}
                {deliveryOption === "daily" && <><p className="font-medium">Daily delivery</p><p>Fixed quantity delivered everyday.</p></>}
                {deliveryOption === "select-days" && <><p className="font-medium">Selected days delivery</p><p>Fixed quantity delivered only on selected days.</p></>}
                {deliveryOption === "alternate" && <><p className="font-medium">Alternate day delivery</p><p>Fixed quantity delivered on alternate days.</p></>}
                {deliveryOption === "varying" && <><p className="font-medium">Varying delivery</p><p>Different quantities delivered on Alternate Days.</p></>}
              </div>

              <div> {/* Start Date Picker */}
                <p className="text-sm font-medium mb-2 block">Select start date</p>
                <div className="space-y-2">
                  {/* Date display field */}
                  {/* Use a direct implementation rather than a popover that closes on click */}
                  <div className="relative">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setCalendarOpen(!calendarOpen)}
                      className="w-full justify-start text-left font-normal h-11 border-gray-300 bg-white"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {startDate ? format(startDate, "dd-MM-yyyy") : "Select a date"}
                    </Button>
                    
                    {calendarOpen && (
                      <div className="absolute top-full left-0 z-50 mt-1 w-auto bg-white border rounded-md shadow-md p-0">
                      <div className="space-y-2 p-2">
                        {/* Month and Year Selection */}
                        <div className="flex gap-2 px-1">
                          <Select
                            value={startDate ? getMonth(startDate).toString() : getMonth(new Date()).toString()}
                            onValueChange={(value) => {
                              const newDate = new Date(startDate || new Date());
                              newDate.setMonth(parseInt(value));
                              setStartDate(newDate);
                            }}
                          >
                            <SelectTrigger className="flex-1">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent position="popper">
                              <SelectItem value="0">January</SelectItem>
                              <SelectItem value="1">February</SelectItem>
                              <SelectItem value="2">March</SelectItem>
                              <SelectItem value="3">April</SelectItem>
                              <SelectItem value="4">May</SelectItem>
                              <SelectItem value="5">June</SelectItem>
                              <SelectItem value="6">July</SelectItem>
                              <SelectItem value="7">August</SelectItem>
                              <SelectItem value="8">September</SelectItem>
                              <SelectItem value="9">October</SelectItem>
                              <SelectItem value="10">November</SelectItem>
                              <SelectItem value="11">December</SelectItem>
                            </SelectContent>
                          </Select>
                          
                          <Select
                            value={startDate ? getYear(startDate).toString() : getYear(new Date()).toString()}
                            onValueChange={(value) => {
                              const newDate = new Date(startDate || new Date());
                              newDate.setFullYear(parseInt(value));
                              setStartDate(newDate);
                            }}
                          >
                            <SelectTrigger className="flex-1">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {Array.from({ length: 50 }, (_, i) => {
                                const year = 2000 + i;
                                return (
                                  <SelectItem key={year} value={year.toString()}>
                                    {year}
                                  </SelectItem>
                                );
                              })}
                            </SelectContent>
                          </Select>
                        </div>
                      
                        <Calendar
                          mode="single"
                          selected={startDate}
                          onSelect={(date) => {
                            if (date) {
                              setStartDate(date);
                              setCalendarOpen(false); // Close calendar when a date is selected
                            }
                          }}
                          defaultMonth={startDate || new Date()}
                          className="border-none p-0"
                          classNames={{
                            months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
                            month: "space-y-2",
                            caption: "flex justify-center pt-1 relative items-center",
                            caption_label: "text-sm font-medium",
                            nav: "space-x-1 flex items-center",
                            nav_button: "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100",
                            nav_button_previous: "absolute left-1",
                            nav_button_next: "absolute right-1",
                            table: "w-full border-collapse space-y-1",
                            head_row: "flex",
                            head_cell: "text-muted-foreground rounded-md w-9 font-normal text-[0.8rem]",
                            row: "flex w-full mt-2",
                            cell: "text-center text-sm p-0 relative hover:bg-green-50 [&:has([aria-selected])]:bg-green-50 first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
                            day: "h-9 w-9 p-0 font-normal aria-selected:opacity-100 cursor-pointer rounded-md",
                            day_today: "bg-accent text-accent-foreground",
                            day_selected: "bg-green-500 text-white hover:bg-green-500 hover:text-white focus:bg-green-500 focus:text-white",
                            day_outside: "text-muted-foreground opacity-50",
                            day_disabled: "text-muted-foreground opacity-50",
                            day_range_middle: "aria-selected:bg-green-50 aria-selected:text-green-900",
                            day_hidden: "invisible"
                          }}
                        />
                      </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="pt-1"> {/* Delivery Address Section */}
                <p className="text-sm font-medium mb-3 block">Delivery address</p>
                {isLoadingAddresses ? (
                  <div className="flex items-center justify-center py-4">
                    <span className="ml-2">Loading addresses...</span>
                  </div>
                ) : userAddresses.length > 0 ? (
                  <RadioGroup value={selectedAddressId ?? ""} onValueChange={setSelectedAddressId}>
                    {userAddresses.map((address) => {
                      // Ensure the address ID is a string for RadioGroup compatibility
                      const addressId = String(address.id);
                      console.log(`Rendering address option: ${addressId}, selected=${addressId === selectedAddressId}`);
                      return (
                        <div key={addressId} className="flex items-start space-x-2 mb-3 p-3 border rounded-md hover:bg-white bg-white">
                          <RadioGroupItem value={addressId} id={`modal-address-${addressId}`} className="text-green-500 mt-1" />
                          <div>
                            <Label htmlFor={`address-${address.id}`} className="flex-1 cursor-pointer">
                              <div className="flex justify-between items-center">
                                <span className="font-medium block">{address.recipientName}</span>
                                {address.label && <Badge variant="outline" className="text-xs">{address.label}</Badge>}
                              </div>
                              <span className="text-xs text-gray-600 block">
                                {address.plotBuilding}, {address.streetArea}, {address.city} - {address.pincode}
                              </span>
                            </Label>
                          </div>
                        </div>
                      );
                    })}
                  </RadioGroup>
                ) : (
                  <p className="text-sm text-gray-500">No addresses found. Please add one.</p>
                )}
                <Button variant="outline" className="mt-2 text-sm border-gray-300 text-gray-700 bg-white" size="sm" onClick={() => setModalView('addressForm')}>
                  <Plus className="h-3 w-3 mr-1" /> Add address
                </Button>
              </div>
            </div>
          ) : (
            // Address Form View
            <div className="space-y-5">
              <h3 className="text-lg font-medium">Add New Address</h3>
              <div>
                <Label htmlFor="address-label" className="text-sm font-medium mb-2 block">Address Label</Label>
                <RadioGroup defaultValue="Home" value={addressFormState.label} onValueChange={handleAddressLabelChange} className="flex gap-4 mt-1" id="address-label">
                  <div className="flex items-center space-x-2"><RadioGroupItem value="Home" id="type-home" className="text-green-500"/><Label htmlFor="type-home" className="text-sm">Home</Label></div>
                  <div className="flex items-center space-x-2"><RadioGroupItem value="Work" id="type-work" className="text-green-500"/><Label htmlFor="type-work" className="text-sm">Work</Label></div>
                  <div className="flex items-center space-x-2"><RadioGroupItem value="Other" id="type-other" className="text-green-500"/><Label htmlFor="type-other" className="text-sm">Other</Label></div>
                </RadioGroup>
              </div>
              <div>
                <Label htmlFor="address-recipient" className="text-sm font-medium mb-1.5 block">Delivery To*</Label>
                <Input id="address-recipient" name="recipientName" value={addressFormState.recipientName} onChange={handleAddressFormChange} placeholder="Full name of recipient" className="h-11 bg-white" />
              </div>
              <div>
                <Label htmlFor="address-mobile" className="text-sm font-medium mb-1.5 block">Mobile Number*</Label>
                <Input id="address-mobile" name="mobile" value={addressFormState.mobile} onChange={handleAddressFormChange} placeholder="Mobile number" className="h-11 bg-white" />
              </div>
              <div>
                <Label htmlFor="address-plot" className="text-sm font-medium mb-1.5 block">Plot/Building*</Label>
                <Input id="address-plot" name="plotBuilding" value={addressFormState.plotBuilding} onChange={handleAddressFormChange} placeholder="Plot number, building name" className="h-11 bg-white" />
              </div>
              <div>
                <Label htmlFor="address-street" className="text-sm font-medium mb-1.5 block">Street/Area*</Label>
                <Input id="address-street" name="streetArea" value={addressFormState.streetArea} onChange={handleAddressFormChange} placeholder="Street, area" className="h-11 bg-white"/>
              </div>
              <div>
                <Label htmlFor="address-landmark" className="text-sm font-medium mb-1.5 block">Landmark (Optional)</Label>
                <Input id="address-landmark" name="landmark" value={addressFormState.landmark} onChange={handleAddressFormChange} placeholder="Nearby landmark" className="h-11 bg-white"/>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="address-city" className="text-sm font-medium mb-1.5 block">City*</Label>
                  <Input id="address-city" name="city" value={addressFormState.city} onChange={handleAddressFormChange} placeholder="City" className="h-11 bg-white" />
                </div>
                <div>
                  <Label htmlFor="address-state" className="text-sm font-medium mb-1.5 block">State*</Label>
                  <Input id="address-state" name="state" value={addressFormState.state} onChange={handleAddressFormChange} placeholder="State" className="h-11 bg-white" />
                </div>
              </div>
              <div>
                <Label htmlFor="address-pincode" className="text-sm font-medium mb-1.5 block">Pincode*</Label>
                <Input id="address-pincode" name="pincode" value={addressFormState.pincode} onChange={handleAddressFormChange} placeholder="Pincode" className="h-11 bg-white" />
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
          )}
        </div>

        <DialogFooter className="p-5 border-t sticky top-0 bg-white z-10">
          {modalView === 'subscriptionDetails' ? (
            <Button 
              onClick={handleInternalAddItem} 
              className="w-full bg-green-500 hover:bg-green-600 text-white py-3 rounded-md font-medium text-base h-12"
              disabled={!selectedAddressId || isLoadingAddresses}
            >
              Subscribe
            </Button>
          ) : (
            <div className="flex justify-end gap-3 w-full">
              <Button variant="outline" onClick={handleCancelAddAddress} className="rounded-md h-11 border-gray-300">Cancel</Button>
              <Button onClick={handleSaveAddress} className="bg-green-500 hover:bg-green-600 text-white rounded-md h-11">Save Address</Button>
            </div>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};


 