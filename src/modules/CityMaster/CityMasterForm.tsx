import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { City, createCity, updateCity } from '../../services/cityMasterService';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Save } from 'lucide-react';

const cityFormSchema = z.object({
  name: z.string().min(1, 'City name is required').max(100, 'Name must be 100 characters or less'),
});

export type CityFormData = z.infer<typeof cityFormSchema>;

interface CityMasterFormProps {
  initialData?: City | null;
  onClose: () => void;
  onSuccess: (city: City) => void;
}

const CityMasterForm: React.FC<CityMasterFormProps> = ({ initialData, onClose, onSuccess }) => {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CityFormData>({
    resolver: zodResolver(cityFormSchema),
    defaultValues: {
      name: initialData?.name || '',
    },
  });

  useEffect(() => {
    if (initialData) {
      reset({ name: initialData.name });
    } else {
      reset({ name: '' });
    }
  }, [initialData, reset]);

  const onSubmit = async (data: CityFormData) => {
    try {
      let result: City;
      if (initialData && initialData.id) {
        result = await updateCity(initialData.id, data);
        toast.success('City updated successfully!');
      } else {
        result = await createCity(data);
        toast.success('City created successfully!');
      }
      onSuccess(result);
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || (initialData ? 'Failed to update city' : 'Failed to create city');
      toast.error(errorMessage);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid gap-2">
        <Label htmlFor="name">City Name <span className="text-red-500">*</span></Label>
        <Input id="name" {...register('name')} autoFocus />
        {errors.name && <p className="text-sm text-red-600 mt-1">{errors.name.message}</p>}
      </div>

      <div className="flex justify-end space-x-3 pt-4">
        <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting} className="gap-2">
          {isSubmitting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : <Save className="h-4 w-4" />}
          {isSubmitting ? 'Saving...' : 'Save'}
        </Button>
      </div>
    </form>
  );
};

export default CityMasterForm;
