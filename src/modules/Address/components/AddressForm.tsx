import React from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import * as apiService from '@/services/apiService';

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
}

// Validation schema using Zod
const addressSchema = z.object({
  recipientName: z.string().min(1, 'Recipient name is required'),
  mobile: z.string().min(1, 'Mobile number is required').regex(/^\d{10,}$/, 'Mobile number must be at least 10 digits and contain only numbers'),
  plotBuilding: z.string().min(1, 'Flat/House/Plot number is required'),
  streetArea: z.string().min(1, 'Street/Area name is required'),
  landmark: z.string().optional(),
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
}

interface AddressFormProps {
  mode: 'create' | 'edit';
  addressId?: string;
  initialData?: DeliveryAddress;
  onSuccess?: (data: DeliveryAddress) => void;
  onCancel?: () => void; // Added for modal integration
  depotId?: number;
  locations?: Location[];
}

const AddressForm: React.FC<AddressFormProps> = ({
  mode,
  addressId,
  initialData,
  onSuccess,
  onCancel, // Added for modal integration
  depotId,
  locations,
}) => {
  const navigate = useNavigate();
  const isEditMode = mode === 'edit';

  const form = useForm<AddressFormData>({
    resolver: zodResolver(addressSchema),
    defaultValues: initialData ? {
      recipientName: initialData.recipientName,
      mobile: initialData.mobile,
      plotBuilding: initialData.plotBuilding,
      streetArea: initialData.streetArea,
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
      city: '',
      state: '',
      isDefault: false,
      label: 'Home', // Added label default value
    },
  });

  const onSubmit = async (data: AddressFormData) => {
    try {
      let response;
      
      if (isEditMode && addressId) {
        response = await apiService.put(`/delivery-addresses/${addressId}`, data);
        toast.success('Address updated successfully');
      } else {
        const payload = { ...data, depotId };
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
    <Card className="w-full  mx-auto">
      <CardHeader>
        <CardTitle>{isEditMode ? 'Edit Address' : 'Add New Delivery Address'}</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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
                      className="flex space-x-4 pt-2"
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                      <Input placeholder="Enter mobile number" {...field} />
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

            {locations && locations.length > 0 && (
              <FormField
                control={form.control}
                name="locationId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Your Nearest Location*</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a location" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="max-h-60 overflow-y-auto">
                        {locations.map(location => (
                          <SelectItem key={location.id} value={String(location.id)}>
                            {location.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                    <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded-md">
                      <p className="text-xs text-blue-700">
                        <span className="font-medium">Note:</span> If your area is not listed above, please contact us at <span className="font-semibold">+91-XXXXXXXXXX</span> for assistance with delivery arrangements.
                      </p>
                    </div>
                  </FormItem>
                )}
              />
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="pincode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Pincode*</FormLabel>
                    <FormControl>
                      <Input 
                        type="number"
                      placeholder="Enter pincode" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="city"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>City*</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter city" {...field} />
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
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
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

            <div className="flex justify-end gap-2">
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
                className="w-full md:w-auto mr-2"
              >
                Cancel
              </Button>
            <Button type="submit" disabled={form.formState.isSubmitting} className="w-full md:w-auto">
              {form.formState.isSubmitting ? (isEditMode ? 'Saving...' : 'Adding...') : (isEditMode ? 'Save Changes' : 'Add Address')}
            </Button>
          </div>
        </form>
        </Form>
      </CardContent>
    </Card>
  );
};

export default AddressForm;
