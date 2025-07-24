import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import * as apiService from '@/services/apiService';
import { ArrowLeft } from 'lucide-react';

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { INDIAN_STATES } from '@/config/states';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  getPublicAreaMasters,
  validatePincodeInAreas,
  type AreaMaster,
} from '@/services/areaMasterService';
import { getCitiesList, type City } from '@/services/cityMasterService';
import { EnhancedLeadCaptureModal } from '@/modules/Lead';
import { PincodeValidator } from '@/components/ui/PincodeValidator';

export interface DeliveryAddress {
  id: string;
  memberId: number;
  recipientName: string;
  mobile: string;
  plotBuilding: string;
  streetArea: string;
  landmark?: string;
  pincode: string;
  city: string;
  state: string;
  isDefault: boolean;
  label?: string; // Added label
  createdAt: string;
  updatedAt: string;
  locationId?: number;
  location?: {
    id: number;
    name: string;
    cityId: number;
    createdAt: string;
    updatedAt: string;
    agencyId: number;
  };
}

// Validation schema using Zod
const addressSchema = z.object({
  recipientName: z.string().min(1, 'Recipient name is required'),
  mobile: z.string().min(1, 'Mobile number is required').regex(/^\d{10,}$/, 'Mobile number must be at least 10 digits and contain only numbers'),
  plotBuilding: z.string().min(1, 'Flat/House/Plot number is required'),
  streetArea: z.string().min(1, 'Street/Area name is required'),
  landmark: z.string().min(1, 'Landmark is required'),
  pincode: z.string().min(1, 'Pincode is required').regex(/^\d{6}$/, 'Pincode must be exactly 6 numeric digits'),
  city: z.string().min(1, 'City is required'),
  state: z.string().min(1, 'State is required'),
  isDefault: z.boolean().default(false),
  label: z.enum(['Home', 'Work', 'Other']).optional().default('Home'),
  locationId: z.string().optional(),
});

type AddressFormData = z.infer<typeof addressSchema>;

interface Location {
  id: number;
  name: string;
  city?: {
    id: number;
    name: string;
  };
}

interface AddressFormProps {
  mode: 'create' | 'edit';
  addressId?: string;
  initialData?: DeliveryAddress;
  onSuccess?: (data: DeliveryAddress) => void;
  onCancel?: () => void; // Added for modal integration
  onBack?: () => void; // Added for back navigation
  depotId?: number;
  locations?: Location[];
}

const AddressForm: React.FC<AddressFormProps> = ({
  mode,
  addressId,
  initialData,
  onSuccess,
  onCancel, // Added for modal integration
  onBack, // Added for back navigation
  depotId,
  locations: propLocations,
}) => {
  const navigate = useNavigate();
  const isEditMode = mode === 'edit';
  const [locations, setLocations] = useState<Location[]>(propLocations || []);
  const [isLoadingLocations, setIsLoadingLocations] = useState(false);
  
  // Area master and city filtering states
  const [areaMasters, setAreaMasters] = useState<AreaMaster[]>([]);
  const [filteredAreaMasters, setFilteredAreaMasters] = useState<AreaMaster[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [selectedCityId, setSelectedCityId] = useState<number | null>(null);
  const [selectedAreaMaster, setSelectedAreaMaster] = useState<AreaMaster | null>(null);
  
  // Pincode validation state
  const [pincodeValidation, setPincodeValidation] = useState<{
    isValid: boolean;
    message: string;
    isValidating: boolean;
  }>({ isValid: false, message: "", isValidating: false });

  // Lead capture modal state
  const [showEnhancedLeadModal, setShowEnhancedLeadModal] = useState(false);
  const [serviceNotAvailableMessage, setServiceNotAvailableMessage] = useState<string>("");
  const [isInvalidPincodeMode, setIsInvalidPincodeMode] = useState(false);

  // Fetch locations if not provided as props
  useEffect(() => {
    const fetchLocations = async () => {
      if (propLocations && propLocations.length > 0) {
        setLocations(propLocations);
        return;
      }

      setIsLoadingLocations(true);
      try {
        const response = await apiService.get('/public/locations');
        // Use the same structure as useLocations hook
        if (response && response.data && Array.isArray(response.data.locations)) {
          setLocations(response.data.locations);
        } else if (response && Array.isArray(response)) {
          // Fallback in case the response structure is different
          setLocations(response);
        }
      } catch (error) {
        console.error('Failed to fetch locations:', error);
        toast.error('Could not load locations.');
      } finally {
        setIsLoadingLocations(false);
      }
    };

    fetchLocations();
  }, [propLocations]);

  // Fetch area masters and cities on component mount
  useEffect(() => {
    fetchAreaMasters();
    fetchCities();
  }, []);

  // Fetch area masters
  const fetchAreaMasters = async () => {
    try {
      const areaMastersList = await getPublicAreaMasters();
      setAreaMasters(areaMastersList);
    } catch (error) {
      console.error('Failed to fetch area masters:', error);
      toast.error('Could not load delivery areas.');
    }
  };

  // Fetch cities
  const fetchCities = async () => {
    try {
      const citiesList = await getCitiesList();
      setCities(citiesList);
    } catch (error) {
      console.error('Failed to fetch cities:', error);
      toast.error('Could not load cities.');
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

  // Handle area master selection and auto-fill city
  const handleAreaMasterSelection = (areaMaster: AreaMaster) => {
    setSelectedAreaMaster(areaMaster);
    
    // Auto-fill city from selected area master
    if (areaMaster.city?.name) {
      form.setValue('city', areaMaster.city.name);
    }
    
    // Validate existing pincode against new area master if pincode exists
    const currentPincode = form.getValues('pincode');
    if (currentPincode && currentPincode.length === 6) {
      validatePincode(currentPincode, areaMaster);
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
      
      const isValid = validation.isValid;
      setPincodeValidation({
        isValid: isValid,
        message: isValid 
          ? `Great ! We deliver in your location` 
          : `We currently don't serve pincode ${pincode} in ${currentAreaMaster?.name || 'this area'}.`,
        isValidating: false
      });
      
      // Track invalid pincode mode
      setIsInvalidPincodeMode(!isValid && pincode.length === 6);
    }
  };
  
  
  // Handle request service button click
  const handleRequestService = () => {
    const formValues = form.getValues();
    const message = selectedAreaMaster 
      ? `We currently don't serve pincode ${formValues.pincode} in ${selectedAreaMaster.name}. Help us prioritize expanding to your area!`
      : `We currently don't serve pincode ${formValues.pincode}. Help us prioritize expanding to your area!`;
    
    setServiceNotAvailableMessage(message);
    setShowEnhancedLeadModal(true);
  };

  const form = useForm<AddressFormData>({
    resolver: zodResolver(addressSchema),
    defaultValues: initialData ? {
      recipientName: initialData.recipientName,
      mobile: initialData.mobile,
      plotBuilding: initialData.plotBuilding,
      streetArea: initialData.streetArea,
      locationId: initialData.locationId ? String(initialData.locationId) : undefined,
      landmark: initialData.landmark || '',
      pincode: initialData.pincode,
      city: initialData.city,
      state: initialData.state,
      isDefault: initialData.isDefault,
      label: (initialData.label === 'Home' || initialData.label === 'Work' || initialData.label === 'Other') 
             ? initialData.label 
             : 'Home',
    } : {
      recipientName: '',
      mobile: '',
      plotBuilding: '',
      streetArea: '',
      landmark: '',
      pincode: '',
      city: 'Dombivli',
      state: 'Maharashtra',
      isDefault: false,
      label: 'Home', // Added label default value
    },
  });

  // Debug logging and form reset when initialData changes
  useEffect(() => {
    if (initialData) {
      console.log('Initial data:', initialData);
      console.log('LocationId from initial data:', initialData.locationId);
      console.log('Converted locationId:', initialData.locationId ? String(initialData.locationId) : undefined);
      
      // Reset form with new initial data
      form.reset({
        recipientName: initialData.recipientName,
        mobile: initialData.mobile,
        plotBuilding: initialData.plotBuilding,
        streetArea: initialData.streetArea,
        locationId: initialData.locationId ? String(initialData.locationId) : undefined,
        landmark: initialData.landmark || '',
        pincode: initialData.pincode,
        city: initialData.city,
        state: initialData.state,
        isDefault: initialData.isDefault,
        label: (initialData.label === 'Home' || initialData.label === 'Work' || initialData.label === 'Other') 
               ? initialData.label 
               : 'Home',
      });
    }
  }, [initialData, form]);

  // Find and set area master when editing existing address
  useEffect(() => {
    if (initialData && areaMasters.length > 0 && cities.length > 0 && !selectedAreaMaster) {
      console.log('Looking for matching area master for existing address:', {
        city: initialData.city,
        pincode: initialData.pincode
      });
      
      // Find the city that matches the initial data
      const matchingCity = cities.find(city => 
        city.name.toLowerCase() === initialData.city.toLowerCase()
      );
      
      if (matchingCity) {
        console.log('Found matching city:', matchingCity.name);
        setSelectedCityId(matchingCity.id);
        
        // Find area master that serves this pincode and city
        const matchingAreaMaster = areaMasters.find(areaMaster => {
          // Check if area master matches the city
          const matchesCity = areaMaster.cityId === matchingCity.id || 
                             areaMaster.city?.id === matchingCity.id;
          
          if (!matchesCity) return false;
          
          // Check if area master serves this pincode
          const servesPin = validatePincodeInAreas(initialData.pincode, [areaMaster]);
          
          return servesPin.isValid;
        });
        
        if (matchingAreaMaster) {
          console.log('Found matching area master for editing:', matchingAreaMaster.name);
          setSelectedAreaMaster(matchingAreaMaster);
          
          // Validate the pincode with the selected area master
          if (initialData.pincode && initialData.pincode.length === 6) {
            validatePincode(initialData.pincode, matchingAreaMaster);
          }
        } else {
          console.log('No matching area master found for existing address');
          // Try to find any area master in the same city as fallback
          const cityAreaMaster = areaMasters.find(areaMaster => 
            areaMaster.cityId === matchingCity.id || areaMaster.city?.id === matchingCity.id
          );
          if (cityAreaMaster) {
            console.log('Using fallback area master from same city:', cityAreaMaster.name);
            setSelectedAreaMaster(cityAreaMaster);
            // Still validate the pincode to show if it's not served
            if (initialData.pincode && initialData.pincode.length === 6) {
              validatePincode(initialData.pincode, cityAreaMaster);
            }
          }
        }
      }
    }
  }, [initialData, areaMasters, cities, selectedAreaMaster]);

  const onSubmit = async (data: AddressFormData) => {
    // CRITICAL: Block submission if pincode is invalid
    if (isInvalidPincodeMode) {
      toast.error('This address cannot be saved with an invalid pincode. Please use "Request Service in Your Area" instead.');
      return;
    }
    
    try {
      // Validate pincode before submission if area master is selected
      if (selectedAreaMaster && data.pincode && data.pincode.length === 6) {
        if (!pincodeValidation.isValid) {
          toast.error(`Cannot save address: Pincode ${data.pincode} is not served by ${selectedAreaMaster.name}. Please select a different area or correct the pincode.`);
          return;
        }
      }
      
      // Validate that an area master is selected
      if (!selectedAreaMaster) {
        toast.error('Please select a delivery area before saving the address.');
        return;
      }
      
      let response;
      
      // Prepare payload, ensuring locationId is handled correctly
      const { locationId, ...addressData } = data;
      const payload = {
        ...addressData,
        depotId,
        // Only include locationId in payload if it's a valid number
        ...(locationId && !isNaN(Number(locationId)) ? { locationId: Number(locationId) } : {})
      };
      
      if (isEditMode && addressId) {
        response = await apiService.put(`/delivery-addresses/${addressId}`, payload);
        toast.success('Address updated successfully');
      } else {
        response = await apiService.post('/delivery-addresses', payload);
        toast.success('Address created successfully');
      }
      
      if (onSuccess) {
        onSuccess(response);
      } else {
        navigate('/member/addresses');
      }
    } catch (error: any) {
      toast.error(error.message || 'An error occurred while saving the address');
    }
  };


  

  return (
    <>
      <Card className="w-full mx-auto">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            {(onBack || onCancel) && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => {
                  if (onBack) {
                    onBack();
                  } else if (onCancel) {
                    onCancel();
                  } else {
                    navigate(-1);
                  }
                }}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            <CardTitle className="text-lg sm:text-xl">{isEditMode ? 'Edit Address' : 'Add New Delivery Address'}</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="px-4 sm:px-6 max-h-[70vh] overflow-y-auto">
          <Form {...form}>
            <form 
            onSubmit={(e) => {
              e.preventDefault();
              
              // Validate area master selection
              if (!selectedAreaMaster) {
                toast.error('Please select a delivery area before saving the address.');
                return;
              }
              
              // Validate pincode if entered
              const pincode = form.getValues('pincode');
              if (pincode && pincode.length === 6) {
                if (pincodeValidation.isValidating) {
                  toast.error('Please wait for pincode validation to complete.');
                  return;
                }
                if (!pincodeValidation.isValid) {
                  toast.error(`Cannot save address: Pincode ${pincode} is not served by ${selectedAreaMaster.name}. Please click "Request Service in Your Area" if you need delivery to this location.`);
                  return;
                }
              }
              
              // Only proceed with form submission if all validations pass
              form.handleSubmit(onSubmit)(e);
            }} 
            className="space-y-6"
          >
            <FormField
              control={form.control}
              name="label"
              render={({ field }) => (
                <FormItem className="mb-4">
                  <FormLabel>Label As</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      className="flex flex-wrap gap-3 sm:gap-4 pt-2"
                    >
                      <FormItem className="flex items-center space-x-2 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="Home" />
                        </FormControl>
                        <FormLabel className="font-normal">Home</FormLabel>
                      </FormItem>
                      <FormItem className="flex items-center space-x-2 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="Work" />
                        </FormControl>
                        <FormLabel className="font-normal">Work</FormLabel>
                      </FormItem>
                      <FormItem className="flex items-center space-x-2 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="Other" />
                        </FormControl>
                        <FormLabel className="font-normal">Other</FormLabel>
                      </FormItem>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="recipientName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Recipient Name*</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter recipient name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="mobile"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mobile Number*</FormLabel>
                    <FormControl>
                      <Input
                      max={10}
                      maxLength={10}
                       placeholder="Enter mobile number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="plotBuilding"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Flat, House, Plot Number*</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter flat, house, or plot number" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="streetArea"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Street/Area Name*</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter street or area name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="landmark"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Landmark (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter landmark" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* City Filter for Area Master Selection */}
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1.5 block">
                  Filter by City
                </label>
                <Select
                  onValueChange={(value) => {
                    const cityId = value === "all" ? null : parseInt(value);
                    setSelectedCityId(cityId);
                    // Clear area master selection when city changes
                    setSelectedAreaMaster(null);
                  }}
                  value={selectedCityId?.toString() || "all"}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by city" />
                  </SelectTrigger>
                  <SelectContent className="max-h-60 overflow-y-auto">
                    <SelectItem value="all">All Cities</SelectItem>
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
              
              {/* Area Master Selection */}
              <div>
                <label className="text-sm font-medium mb-1.5 block">
                   Delivery Areas* <span className="text-xs text-gray-500"></span>
                </label>
                <Select
                  onValueChange={(value) => {
                    const areaMaster = filteredAreaMasters.find(am => am.id === parseInt(value));
                    if (areaMaster) {
                      handleAreaMasterSelection(areaMaster);
                      // Don't set locationId as AreaMaster.id doesn't map to Location.id
                      // locationId should remain null/undefined
                    }
                  }}
                  value={selectedAreaMaster?.id?.toString() || ""}
                >
                  <SelectTrigger>
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
                        {areaMaster.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
            
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="pincode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Pincode*</FormLabel>
                    <FormControl>
                      <Input 
                        type="text"
                        placeholder="Enter pincode" 
                        max={6}
                        {...field} 
                        onChange={(e) => {
                          field.onChange(e);
                          const value = e.target.value;
                          // Validate pincode when it changes
                          if (value.length === 6 && /^\d{6}$/.test(value)) {
                            validatePincode(value);
                          } else {
                            // Clear validation when pincode is incomplete
                            setPincodeValidation({ isValid: false, message: "", isValidating: false });
                          }
                        }}
                        onBlur={(e) => {
                          // Re-validate on blur to ensure current state
                          const value = e.target.value;
                          if (value.length === 6 && /^\d{6}$/.test(value) && selectedAreaMaster) {
                            validatePincode(value);
                          }
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="state"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>State*</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a state" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="max-h-60 overflow-y-auto">
                        {INDIAN_STATES.map((st) => (
                          <SelectItem key={st.value} value={st.label}>
                            {st.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            {/* PincodeValidator Component */}
            {selectedAreaMaster && (
              <PincodeValidator
                pincode={form.watch('pincode') || ''}
                isValid={pincodeValidation.isValid}
                message={pincodeValidation.message}
                isValidating={pincodeValidation.isValidating}
                showServiceRequest={!pincodeValidation.isValid && !pincodeValidation.isValidating && (form.watch('pincode')?.length === 6)}
                onRequestService={handleRequestService}
              />
            )}
            
         
            {/* Hidden fields - auto-filled by area master selection */}
            <FormField
              control={form.control}
              name="city"
              render={({ field }) => (
                <FormItem className="hidden">
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="locationId"
              render={({ field }) => (
                <FormItem className="hidden">
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="isDefault"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>Set as Default Address</FormLabel>
                  </div>
                </FormItem>
              )}
            />
            

            <div className="flex flex-col sm:flex-row justify-end gap-2 mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  if (onCancel) {
                    onCancel();
                  } else {
                    navigate('/member/addresses');
                  }
                }}
                disabled={form.formState.isSubmitting}
                className="w-full sm:w-auto order-2 sm:order-1"
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={
                  form.formState.isSubmitting || 
                  !selectedAreaMaster ||
                  pincodeValidation.isValidating ||
                  (!!selectedAreaMaster && form.watch('pincode')?.length === 6 && !pincodeValidation.isValid)
                } 
                className="w-full sm:w-auto order-1 sm:order-2"
                title={
                  !selectedAreaMaster ? "Please select a delivery area" :
                  (form.watch('pincode')?.length === 6 && !pincodeValidation.isValid) ? 
                    `Pincode ${form.watch('pincode')} is not served in this area` : 
                    undefined
                }
              >
                {form.formState.isSubmitting ? (isEditMode ? 'Saving...' : 'Adding...') : (isEditMode ? 'Save Changes' : 'Add Address')}
              </Button>
            </div>
        </form>
        </Form>
      </CardContent>
    </Card>

    {/* EnhancedLeadCaptureModal */}
    <EnhancedLeadCaptureModal
      isOpen={showEnhancedLeadModal}
      onOpenChange={setShowEnhancedLeadModal}
      message={serviceNotAvailableMessage || `We currently do not serve this area, but we're expanding!`}
      prefilledData={{
        recipientName: form.watch('recipientName') || '',
        mobile: form.watch('mobile') || '',
        plotBuilding: form.watch('plotBuilding') || '',
        streetArea: form.watch('streetArea') || '',
        landmark: form.watch('landmark') || '',
        pincode: form.watch('pincode') || '',
        city: form.watch('city') || selectedAreaMaster?.city?.name || '',
        state: form.watch('state') || ''
      }}
      onSuccess={() => {
        setShowEnhancedLeadModal(false);
        toast.success("Thank you for your interest! We've saved your details and will contact you when we expand to your area.");
      }}
    />
    </>
  );
};

export default AddressForm;
