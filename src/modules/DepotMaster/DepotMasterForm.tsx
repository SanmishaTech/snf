import React, { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { get, post, put } from '../../services/apiService';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Loader2, PlusCircle, Save } from 'lucide-react';

// Define the Zod schema for validation
const depotBaseSchema = z.object({
  name: z.string().min(1, 'Depot name is required').max(100, 'Name must be 100 characters or less'),
  address: z.string().min(1, 'Address is required').max(255, 'Address must be 255 characters or less'),
  city: z.string().min(1, 'City is required').max(255, 'City must be 255 characters or less'),
  contactPerson: z.string().max(100, 'Contact person must be 100 characters or less').optional().or(z.literal('')),
  contactNumber: z.string().max(20, 'Contact number must be 20 characters or less').optional().or(z.literal('')),
  userFullName: z.string().optional(),
  userLoginEmail: z.string().email('Invalid email address').optional().or(z.literal('')),
  userPassword: z.string().optional(),
  isOnline: z.boolean().optional(),
});

export type DepotFormData = z.infer<typeof depotBaseSchema>;

interface DepotMasterFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmitSuccess: () => void;
  initialData?: DepotFormData & { id?: string; };
}

const DepotMasterForm: React.FC<DepotMasterFormProps> = ({ isOpen, onClose, onSubmitSuccess, initialData }) => {
  const isEditMode = !!initialData?.id;

  const depotSchema = depotBaseSchema.superRefine((data, ctx) => {
    if (!isEditMode) {
      if (!data.userFullName || data.userFullName.length < 2) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Admin full name is required',
          path: ['userFullName'],
        });
      }
      if (!data.userPassword || data.userPassword.length < 6) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Password must be at least 6 characters',
          path: ['userPassword'],
        });
      }
    }
  });
  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors, isSubmitting },
  } = useForm<DepotFormData>({
    context: { isEditMode },
    resolver: zodResolver(depotSchema),
  });

  useEffect(() => {
    if (isOpen) {
      const defaultValues = {
        name: '',
        address: '',
        city: '',
        contactPerson: '',
        contactNumber: '',
        userFullName: '',
        userLoginEmail: '',
        userPassword: '',
        isOnline: false,
      };

      if (initialData) {
        reset({ ...defaultValues, ...initialData });
      } else {
        reset(defaultValues);
      }
    }
  }, [initialData, isOpen, reset]);

  const onSubmit = async (data: DepotFormData) => {
    console.log('Submitting data:', data);
    try {
      if (initialData?.id) {
        const { userFullName, userLoginEmail, userPassword, ...depotPayload } = data as any;
        console.log('Payload for PUT request:', depotPayload);
        await put(`/admin/depots/${initialData.id}`, depotPayload);
        toast.success('Depot updated successfully.');
      } else {
        await post('/admin/depots', data);
        toast.success('Depot created successfully.');
      }
      onSubmitSuccess();
      onClose();
    } catch (error: any) {
      console.error('Failed to save depot:', error);
      toast.error(error.message || 'An unknown error occurred while saving the depot.');
    }
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg h-[550px] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initialData?.id ? 'Edit Depot' : 'Add New Depot'}</DialogTitle>
          <DialogDescription>
            {initialData?.id ? 'Update the details of this depot.' : 'Fill in the form below to create a new depot.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-6 py-4">
          <div className="grid gap-2">
            <Label htmlFor="name">Depot Name <span className="text-red-500">*</span></Label>
            <Input id="name" {...register('name')} placeholder="e.g. Central Warehouse" />
            {errors.name && <p className="text-sm text-red-600 mt-1">{errors.name.message}</p>}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="address">Address <span className="text-red-500">*</span></Label>
            <Input id="address" {...register('address')} placeholder="e.g. 123 Main St, Anytown" />
            {errors.address && <p className="text-sm text-red-600 mt-1">{errors.address.message}</p>}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="city">City <span className="text-red-500">*</span></Label>
            <Input id="city" {...register('city')} placeholder="e.g. New York" />
            {errors.city && <p className="text-sm text-red-600 mt-1">{errors.city.message}</p>}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="contactPerson">Contact Person</Label>
            <Input id="contactPerson" {...register('contactPerson')} placeholder="e.g. John Doe" />
            {errors.contactPerson && <p className="text-sm text-red-600 mt-1">{errors.contactPerson.message}</p>}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="contactNumber">Contact Number</Label>
            <Input id="contactNumber" {...register('contactNumber')} placeholder="e.g. +1-555-123-4567" />
            {errors.contactNumber && <p className="text-sm text-red-600 mt-1">{errors.contactNumber.message}</p>}
          </div>

          <div className="flex items-center space-x-2">
            <Controller
              name="isOnline"
              control={control}
              render={({ field }) => (
                <Checkbox
                  id="isOnline"
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              )}
            />
            <Label htmlFor="isOnline" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
              Depot is Online
            </Label>
          </div>

          {/* Admin user fields: only shown when creating */}
          {!initialData?.id && (
            <>
              <div className="grid gap-2">
                <Label htmlFor="userFullName">Admin Full Name <span className="text-red-500">*</span></Label>
                <Input id="userFullName" {...register('userFullName')} placeholder="e.g. Jane Admin" />
                {errors.userFullName && <p className="text-sm text-red-600 mt-1">{errors.userFullName.message}</p>}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="userLoginEmail">Admin Email</Label>
                <Input id="userLoginEmail" {...register('userLoginEmail')} placeholder="e.g. depot@company.com" />
                {errors.userLoginEmail && <p className="text-sm text-red-600 mt-1">{errors.userLoginEmail.message}</p>}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="userPassword">Admin Password <span className="text-red-500">*</span></Label>
                <Input id="userPassword" type="password" {...register('userPassword')} placeholder="Min 6 characters" />
                {errors.userPassword && <p className="text-sm text-red-600 mt-1">{errors.userPassword.message}</p>}
              </div>
            </>
          )}
          <DialogFooter className="mt-2">
            <DialogClose asChild>
              <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" disabled={isSubmitting} className="gap-2">
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : initialData?.id ? (
                <Save className="h-4 w-4" />
              ) : (
                <PlusCircle className="h-4 w-4" />
              )}
              {isSubmitting ? (initialData?.id ? 'Saving...' : 'Creating...') : (initialData?.id ? 'Save Changes' : 'Create Depot')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default DepotMasterForm;
