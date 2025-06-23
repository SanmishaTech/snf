import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Location, createLocation, updateLocation } from '../../services/locationMasterService';
import { City, getCitiesList } from '../../services/cityMasterService';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Save } from 'lucide-react';

const locationFormSchema = z.object({
  name: z.string().min(1, 'Location name is required').max(100, 'Name must be 100 characters or less'),
  cityId: z.number().min(1, 'City is required'),
});

export type LocationFormData = z.infer<typeof locationFormSchema>;

interface LocationMasterFormProps {
  initialData?: Location | null;
  onClose: () => void;
  onSuccess: (location: Location) => void;
}

const LocationMasterForm: React.FC<LocationMasterFormProps> = ({ initialData, onClose, onSuccess }) => {
  const [cities, setCities] = useState<City[]>([]);
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<LocationFormData>({
    resolver: zodResolver(locationFormSchema),
    defaultValues: {
      name: initialData?.name || '',
      cityId: initialData?.cityId || 0,
    },
  });

  useEffect(() => {
    const fetchCities = async () => {
      try {
        const citiesList = await getCitiesList();
        setCities(citiesList);
      } catch (error) {
        toast.error('Failed to fetch cities');
      }
    };
    fetchCities();
  }, []);

  useEffect(() => {
    if (initialData) {
      reset({ name: initialData.name, cityId: initialData.cityId });
    } else {
      reset({ name: '', cityId: 0 });
    }
  }, [initialData, reset]);

  const onSubmit = async (data: LocationFormData) => {
    try {
      let result: Location;
      if (initialData && initialData.id) {
        result = await updateLocation(initialData.id, data);
        toast.success('Location updated successfully!');
      } else {
        result = await createLocation(data);
        toast.success('Location created successfully!');
      }
      onSuccess(result);
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || (initialData ? 'Failed to update location' : 'Failed to create location');
      toast.error(errorMessage);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid gap-2">
        <Label htmlFor="name">Location Name <span className="text-red-500">*</span></Label>
        <Input id="name" {...register('name')} autoFocus />
        {errors.name && <p className="text-sm text-red-600 mt-1">{errors.name.message}</p>}
      </div>

      <div className="grid gap-2">
        <Label htmlFor="cityId">City <span className="text-red-500">*</span></Label>
        <Select onValueChange={(value) => setValue('cityId', parseInt(value))} value={watch('cityId')?.toString()}>
            <SelectTrigger>
                <SelectValue placeholder="Select a city" />
            </SelectTrigger>
            <SelectContent>
                {cities.map(city => (
                    <SelectItem key={city.id} value={city.id.toString()}>{city.name}</SelectItem>
                ))}
            </SelectContent>
        </Select>
        {errors.cityId && <p className="text-sm text-red-600 mt-1">{errors.cityId.message}</p>}
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

export default LocationMasterForm;
