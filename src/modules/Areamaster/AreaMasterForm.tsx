import React, { useState, useEffect } from 'react';
import { AreaMaster, AreaMasterFormData, DeliveryType, createAreaMaster, updateAreaMaster } from '../../services/areaMasterService'; // Adjusted path
import { getAllDepotsList, DepotListItem } from '../../services/depotService';
import { getCitiesList, City } from '../../services/cityMasterService';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { MultiSelect } from '@/components/ui/MultiSelect';

interface AreaMasterFormProps {
  initialData?: AreaMaster;
  onClose: () => void;
  onSuccess: () => void;
}

const AreaMasterForm: React.FC<AreaMasterFormProps> = ({ initialData, onClose, onSuccess }) => {
  const [formData, setFormData] = useState<AreaMasterFormData>({
    name: '',
    pincodes: '',
    depotId: '', // depotId is now optional
    cityId: null, // cityId added
    deliveryType: DeliveryType.HandDelivery,
    isDairyProduct: false,
    deliverySchedule: [],
  });
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [depots, setDepots] = useState<DepotListItem[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pincodeTags, setPincodeTags] = useState<string[]>([]);

  // Delivery schedule options
  const deliveryScheduleOptions = [
    { label: 'Sunday', value: 'sunday' },
    { label: 'Monday', value: 'monday' },
    { label: 'Tuesday', value: 'tuesday' },
    { label: 'Wednesday', value: 'wednesday' },
    { label: 'Thursday', value: 'thursday' },
    { label: 'Friday', value: 'friday' },
    { label: 'Saturday', value: 'saturday' },
  ];

  useEffect(() => {
    if (initialData && depots.length > 0 && cities.length > 0) {
      setFormData({
        name: initialData.name,
        pincodes: initialData.pincodes,
        depotId: initialData.depotId ? String(initialData.depotId) : '', // Optional depot
        cityId: initialData.cityId || null, // City association
        deliveryType: initialData.deliveryType || DeliveryType.HandDelivery, // Ensure valid DeliveryType
        isDairyProduct: initialData.isDairyProduct || false,
        deliverySchedule: initialData.deliverySchedule || [],
      });
    } else if (!initialData) {
      // Reset for new form only if initialData is not present
      setFormData({
        name: '',
        pincodes: '',
        depotId: '',
        cityId: null,
        deliveryType: DeliveryType.HandDelivery,
        isDairyProduct: false,
        deliverySchedule: [],
      });
    }
  }, [initialData, depots, cities]);

  useEffect(() => {
    const fetchDepots = async () => {
      try {
        const depotsData = await getAllDepotsList();
        setDepots(depotsData);
      } catch (error) {
        console.error('Failed to fetch depots', error);
        toast.error('Failed to load depots for selection.');
      }
    };

    const fetchCities = async () => {
      try {
        const citiesData = await getCitiesList();
        setCities(citiesData);
      } catch (error) {
        console.error('Failed to fetch cities', error);
        toast.error('Failed to load cities for selection.');
      }
    };

    fetchDepots();
    fetchCities();
  }, []);

  useEffect(() => {
    // Update tags when initial data pincodes change or form data pincodes change
    const currentPincodes = formData.pincodes || (initialData?.pincodes || '');
    updatePincodeDisplay(currentPincodes);
  }, [formData.pincodes, initialData?.pincodes]); // Added formData.pincodes dependency

  const validatePincodeFormat = (pincodeStr: string): string | null => {
    if (!pincodeStr.trim()) {
      return 'Pincodes are required';
    }
    // Regex to match comma-separated 6-digit pincodes
    // Allows: 123456
    // Allows: 123456,789012
    // Allows: 123456, 789012
    // Does not allow trailing comma like: 123456,
    if (!/^\d{6}(\s*,\s*\d{6})*$/.test(pincodeStr.trim())) {
        // Check for common error: trailing comma
        if (pincodeStr.trim().endsWith(',')) {
            return 'Remove trailing comma from pincodes.';
        }
        // Check for individual invalid pincodes if the overall structure is wrong
        const individualPincodes = pincodeStr.split(',').map(p => p.trim());
        if (individualPincodes.some(p => !/^\d{6}$/.test(p) && p !== '')) {
            return 'Each pincode must be exactly 6 digits.';
        }
        return 'Enter valid 6-digit pincodes, comma-separated (e.g., 123456, 789012).';
    }
    return null;
  };

  const updatePincodeDisplay = (pincodeStr: string) => {
    const validPincodesArray = pincodeStr
      .split(',')
      .map(p => p.trim())
      .filter(p => /^\d{6}$/.test(p));
    setPincodeTags(Array.from(new Set(validPincodesArray))); // Ensure uniqueness
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }
    const pincodeError = validatePincodeFormat(formData.pincodes);
    if (pincodeError) {
      newErrors.pincodes = pincodeError;
    }
    if (!formData.deliveryType) {
      newErrors.deliveryType = 'Delivery type is required';
    }
    if (!formData.deliverySchedule || formData.deliverySchedule.length === 0) {
      newErrors.deliverySchedule = 'At least one delivery schedule option is required';
    }
    // Depot is now optional, no validation required
    // City is optional too, no validation required
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => { // HTMLSelectElement event is handled separately for shadcn Select
    const { name, value } = e.target;
    const newFormData = {
      ...formData,
      [name]: value, // depotId will be handled by handleSelectChange
    };
    setFormData(newFormData);

    if (name === 'pincodes') {
      const validationError = validatePincodeFormat(value);
      setErrors(prevErrors => ({ ...prevErrors, pincodes: validationError || '' }));
      updatePincodeDisplay(value);
    }
  };

  // Specific handler for shadcn Select component
  const handleSelectChange = (name: string, value: string | null) => { // value can now be string | null
    setFormData(prevFormData => ({
      ...prevFormData,
      [name]: name === 'depotId' ? value : name === 'cityId' ? (value ? parseInt(value) : null) : String(value), // Handle cityId as number, depotId as string, others as string
    }));
    if (name === 'deliveryType' && !value) {
        setErrors(prevErrors => ({ ...prevErrors, deliveryType: 'Delivery type is required' }));
    } else if (name === 'deliveryType') {
        setErrors(prevErrors => ({ ...prevErrors, deliveryType: '' }));
    }
  };

  // Handler for checkbox components
  const handleCheckboxChange = (name: string, checked: boolean) => {
    setFormData(prevFormData => ({
      ...prevFormData,
      [name]: checked,
    }));
  };

  // Handler for delivery schedule multi-select
  const handleDeliveryScheduleChange = (selectedValues: string[]) => {
    setFormData(prevFormData => ({
      ...prevFormData,
      deliverySchedule: selectedValues,
    }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!validateForm()) {
      toast.error('Please correct the form errors.');
      return;
    }
    setIsLoading(true);
    try {
      const payload: AreaMasterFormData = {
        ...formData,
        depotId: formData.depotId,
      };

      if (initialData && initialData.id) {
        await updateAreaMaster(initialData.id, payload);
        toast.success('Area master updated successfully!');
      } else {
        await createAreaMaster(payload);
        toast.success('Area master created successfully!');
      }
      onSuccess();
    } catch (err: any) {
      const errorMessage = err.data?.message || err.message || (initialData ? 'Failed to update area master' : 'Failed to create area master');
      toast.error(errorMessage);
      if (err.data?.errors) {
        // Handle specific field errors from backend if available
        const backendErrors: Record<string, string> = {};
        for (const fieldError of err.data.errors) {
            if (fieldError.path && fieldError.message) {
                backendErrors[fieldError.path[0]] = fieldError.message;
            }
        }
        setErrors(prev => ({...prev, ...backendErrors}));
      }
    }
    setIsLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="name">
          Area Name <span className="text-red-500">*</span>
        </Label>
        <Input
          type="text"
          name="name"
          id="name"
          value={formData.name}
          onChange={handleChange}
          className={`${errors.name ? 'border-red-500' : ''}`}
        />
        {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="pincodes">
          Pincodes (comma-separated) <span className="text-red-500">*</span>
        </Label>
        <Input
          type="text"
          name="pincodes"
          id="pincodes"
          value={formData.pincodes}
          onChange={handleChange}
          placeholder="e.g., 110001, 110002"
          className={`${errors.pincodes ? 'border-red-500' : ''}`}
        />
        {errors.pincodes && <p className="mt-1 text-xs text-red-500">{errors.pincodes}</p>}
        {pincodeTags.length > 0 && !errors.pincodes && (
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {pincodeTags.slice(0, 5).map(tag => (
              <span key={tag} className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
                {tag}
              </span>
            ))}
            {pincodeTags.length > 5 && (
              <span 
                className="px-2 py-1 bg-gray-200 text-gray-700 text-xs font-medium rounded-full cursor-help"
                title={`All pincodes: ${pincodeTags.join(', ')}`}
              >
                +{pincodeTags.length - 5} more
              </span>
            )}
          </div>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="cityId">
          Associated City (Optional)
        </Label>
        <Select
          name="cityId"
          value={formData.cityId?.toString() || "none"}
          onValueChange={(value) => handleSelectChange('cityId', value === "none" ? null : value)}
        >
          <SelectTrigger id="cityId">
            <SelectValue placeholder="Select a city (optional)" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">No City Association</SelectItem>
            {cities.map(city => (
              <SelectItem key={city.id} value={String(city.id)}>
                {city.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-gray-600">
          Associate this area with a specific city to help users filter delivery areas.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="depotId">
          Depot (Optional)
        </Label>
        <Select
          name="depotId"
          value={formData.depotId || "none"}
          onValueChange={(value) => handleSelectChange('depotId', value === "none" ? null : value)}
        >
          <SelectTrigger id="depotId">
            <SelectValue placeholder="Select a depot (optional)" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">No Depot Assignment</SelectItem>
            {depots.map(depot => (
              <SelectItem key={depot.id} value={String(depot.id)}>
                {depot.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-gray-600">
          Optionally assign this area to a specific depot for inventory management.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="deliveryType">
          Delivery Type <span className="text-red-500">*</span>
        </Label>
        <Select
          name="deliveryType"
          value={formData.deliveryType}
          onValueChange={(value) => handleSelectChange('deliveryType', value)}
        >
          <SelectTrigger id="deliveryType" className={`${errors.deliveryType ? 'border-red-500' : ''}`}>
            <SelectValue placeholder="Select delivery type" />
          </SelectTrigger>
          <SelectContent>
            {Object.values(DeliveryType).map(type => (
              <SelectItem key={type} value={type}>
                {type.replace(/([A-Z])/g, ' $1').trim()} {/* Format for display */}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.deliveryType && <p className="mt-1 text-xs text-red-500">{errors.deliveryType}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="deliverySchedule">
          Delivery Schedule <span className="text-red-500">*</span>
        </Label>
        <MultiSelect
          options={deliveryScheduleOptions}
          onValueChange={handleDeliveryScheduleChange}
          defaultValue={formData.deliverySchedule}
          placeholder="Select delivery days"
          maxCount={5}
          className={`w-full ${errors.deliverySchedule ? 'border-red-500' : ''}`}
        />
        {errors.deliverySchedule && <p className="mt-1 text-xs text-red-500">{errors.deliverySchedule}</p>}
        <p className="text-xs text-gray-600">
          Select the days when deliveries are available in this area. You can choose specific days or predefined schedules.
        </p>
      </div>

      <div className="space-y-2">
        <div className="flex items-center space-x-2">
          <Checkbox
            id="isDairyProduct"
            checked={formData.isDairyProduct}
            onCheckedChange={(checked) => handleCheckboxChange('isDairyProduct', !!checked)}
          />
          <Label htmlFor="isDairyProduct" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
            Supports Dairy Products
          </Label>
        </div>
        <p className="text-xs text-gray-600">
          Check this if this delivery area can handle dairy products that require special handling/temperature control.
        </p>
      </div>

      <div className="flex justify-end space-x-3 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={onClose}
          disabled={isLoading}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={isLoading}
        >
          {isLoading ? (initialData ? 'Updating...' : 'Creating...') : (initialData ? 'Update Area Master' : 'Create Area Master')}
        </Button>
      </div>
    </form>
  );
};

export default AreaMasterForm;
