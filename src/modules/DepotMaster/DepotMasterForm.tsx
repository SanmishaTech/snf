import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Loader2, PlusCircle, Save } from 'lucide-react';

// Define the Zod schema for validation
const depotSchema = z.object({
  name: z.string().min(1, 'Depot name is required').max(100, 'Name must be 100 characters or less'),
  address: z.string().min(1, 'Address is required').max(255, 'Address must be 255 characters or less'),
  contactPerson: z.string().max(100, 'Contact person must be 100 characters or less').optional().or(z.literal('')), // Allow empty string
  contactNumber: z.string().max(20, 'Contact number must be 20 characters or less').optional().or(z.literal('')), // Allow empty string
});

export type DepotFormData = z.infer<typeof depotSchema>;

interface DepotMasterFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmitSuccess: () => void;
  initialData?: DepotFormData & { id?: string };
}

const DepotMasterForm: React.FC<DepotMasterFormProps> = ({ isOpen, onClose, onSubmitSuccess, initialData }) => {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<DepotFormData>({
    resolver: zodResolver(depotSchema),
    defaultValues: initialData || { name: '', address: '', contactPerson: '', contactNumber: '' },
  });

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        reset(initialData);
      } else {
        reset({ name: '', address: '', contactPerson: '', contactNumber: '' });
      }
    }
  }, [initialData, reset, isOpen]);

  const onSubmit = async (data: DepotFormData) => {
    try {
      if (initialData?.id) {
        await axios.put(`/api/admin/depots/${initialData.id}`, data);
        toast.success('Depot updated successfully.');
      } else {
        await axios.post('/api/admin/depots', data);
        toast.success('Depot created successfully.');
      }
      onSubmitSuccess();
      onClose();
    } catch (error: any) {
      console.error('Failed to save depot:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Failed to save depot.';
      toast.error(errorMessage);
    }
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
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
            <Label htmlFor="contactPerson">Contact Person</Label>
            <Input id="contactPerson" {...register('contactPerson')} placeholder="e.g. John Doe" />
            {errors.contactPerson && <p className="text-sm text-red-600 mt-1">{errors.contactPerson.message}</p>}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="contactNumber">Contact Number</Label>
            <Input id="contactNumber" {...register('contactNumber')} placeholder="e.g. +1-555-123-4567" />
            {errors.contactNumber && <p className="text-sm text-red-600 mt-1">{errors.contactNumber.message}</p>}
          </div>
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
