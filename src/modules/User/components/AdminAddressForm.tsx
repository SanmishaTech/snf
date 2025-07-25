import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { INDIAN_STATES } from '@/config/states';
import { DeliveryAddress } from '@/modules/Address/components/AddressForm';
import { post, put } from '@/services/apiService';
import { toast } from 'sonner';

// Validation schema
const adminAddressSchema = z.object({
  recipientName: z.string().min(1, 'Recipient name is required'),
  mobile: z.string().min(1, 'Mobile number is required').regex(/^\d{10,}$/, 'Mobile number must be at least 10 digits'),
  plotBuilding: z.string().min(1, 'Flat/House/Plot number is required'),
  streetArea: z.string().min(1, 'Street/Area name is required'),
  landmark: z.string().optional(),
  pincode: z.string().min(1, 'Pincode is required').regex(/^\d{6}$/, 'Pincode must be exactly 6 digits'),
  city: z.string().min(1, 'City is required'),
  state: z.string().min(1, 'State is required'),
  isDefault: z.boolean().default(false),
  label: z.enum(['Home', 'Work', 'Other']).default('Home'),
});

type AdminAddressFormData = z.infer<typeof adminAddressSchema>;

interface AdminAddressFormProps {
  mode: 'create' | 'edit';
  memberId: string;
  addressId?: string;
  initialData?: DeliveryAddress;
  onSuccess: (data: DeliveryAddress) => void;
  onCancel: () => void;
}

const AdminAddressForm: React.FC<AdminAddressFormProps> = ({
  mode,
  memberId,
  addressId,
  initialData,
  onSuccess,
  onCancel,
}) => {
  const isEditMode = mode === 'edit';

  const form = useForm<AdminAddressFormData>({
    resolver: zodResolver(adminAddressSchema),
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
      state: 'Maharashtra',
      isDefault: false,
      label: 'Home',
    },
  });

  const onSubmit = async (data: AdminAddressFormData) => {
    try {
      let response;
      
      if (isEditMode && addressId) {
        response = await put(`/admin/delivery-addresses/${addressId}`, data);
        toast.success('Address updated successfully');
      } else {
        response = await post('/admin/delivery-addresses', {
          ...data,
          memberId: parseInt(memberId),
        });
        toast.success('Address created successfully');
      }
      
      onSuccess(response);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to save address');
    }
  };

  return (
    <div className="space-y-6 max-h-[70vh] overflow-y-auto px-1">
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {/* Label Selection */}
        <div>
          <Label className="text-sm font-medium mb-2 block">Label As</Label>
          <RadioGroup
            value={form.watch('label')}
            onValueChange={(value) => form.setValue('label', value as 'Home' | 'Work' | 'Other')}
            className="flex gap-4"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="Home" id="home" />
              <Label htmlFor="home">Home</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="Work" id="work" />
              <Label htmlFor="work">Work</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="Other" id="other" />
              <Label htmlFor="other">Other</Label>
            </div>
          </RadioGroup>
        </div>

        {/* Name and Mobile */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="recipientName">Recipient Name *</Label>
            <Input
              id="recipientName"
              {...form.register('recipientName')}
              placeholder="Enter recipient name"
            />
            {form.formState.errors.recipientName && (
              <p className="text-red-500 text-sm mt-1">
                {form.formState.errors.recipientName.message}
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="mobile">Mobile Number *</Label>
            <Input
              id="mobile"
              {...form.register('mobile')}
              placeholder="Enter mobile number"
              maxLength={10}
            />
            {form.formState.errors.mobile && (
              <p className="text-red-500 text-sm mt-1">
                {form.formState.errors.mobile.message}
              </p>
            )}
          </div>
        </div>

        {/* Address Fields */}
        <div>
          <Label htmlFor="plotBuilding">Flat, House, Plot Number *</Label>
          <Input
            id="plotBuilding"
            {...form.register('plotBuilding')}
            placeholder="Enter flat, house, or plot number"
          />
          {form.formState.errors.plotBuilding && (
            <p className="text-red-500 text-sm mt-1">
              {form.formState.errors.plotBuilding.message}
            </p>
          )}
        </div>

        <div>
          <Label htmlFor="streetArea">Street/Area Name *</Label>
          <Input
            id="streetArea"
            {...form.register('streetArea')}
            placeholder="Enter street or area name"
          />
          {form.formState.errors.streetArea && (
            <p className="text-red-500 text-sm mt-1">
              {form.formState.errors.streetArea.message}
            </p>
          )}
        </div>

        <div>
          <Label htmlFor="landmark">Landmark</Label>
          <Input
            id="landmark"
            {...form.register('landmark')}
            placeholder="Enter landmark (optional)"
          />
        </div>

        {/* Pincode and State */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="pincode">Pincode *</Label>
            <Input
              id="pincode"
              {...form.register('pincode')}
              placeholder="Enter pincode"
              maxLength={6}
            />
            {form.formState.errors.pincode && (
              <p className="text-red-500 text-sm mt-1">
                {form.formState.errors.pincode.message}
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="state">State *</Label>
            <Select
              value={form.watch('state')}
              onValueChange={(value) => form.setValue('state', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a state" />
              </SelectTrigger>
              <SelectContent className="max-h-60 overflow-y-auto">
                {INDIAN_STATES.map((state) => (
                  <SelectItem key={state.value} value={state.label}>
                    {state.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {form.formState.errors.state && (
              <p className="text-red-500 text-sm mt-1">
                {form.formState.errors.state.message}
              </p>
            )}
          </div>
        </div>

        {/* City */}
        <div>
          <Label htmlFor="city">City *</Label>
          <Input
            id="city"
            {...form.register('city')}
            placeholder="Enter city"
          />
          {form.formState.errors.city && (
            <p className="text-red-500 text-sm mt-1">
              {form.formState.errors.city.message}
            </p>
          )}
        </div>

        {/* Default Address Checkbox */}
        <div className="flex items-center space-x-2">
          <Checkbox
            id="isDefault"
            checked={form.watch('isDefault')}
            onCheckedChange={(checked) => form.setValue('isDefault', !!checked)}
          />
          <Label htmlFor="isDefault" className="text-sm">
            Set as default address
          </Label>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 pt-4">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button 
            type="submit" 
            disabled={form.formState.isSubmitting}
          >
            {form.formState.isSubmitting 
              ? (isEditMode ? 'Updating...' : 'Creating...') 
              : (isEditMode ? 'Update Address' : 'Create Address')
            }
          </Button>
        </div>
      </form>
    </div>
  );
};

export default AdminAddressForm;