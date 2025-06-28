import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Location, createLocation, updateLocation } from '../../services/locationMasterService';
import { City, getCitiesList } from '../../services/cityMasterService';
import { getAgenciesList, Agency } from '@/services/agencyService';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Save } from 'lucide-react';

const formSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  cityId: z.number({ required_error: 'City is required' }).min(1, 'City is required'),
  agencyId: z.number().nullable().optional(),
});

export type LocationFormData = z.infer<typeof formSchema>;

interface LocationMasterFormProps {
  initialData?: Location | null;
  onClose: () => void;
  onSuccess: (location: Location) => void;
}

const LocationMasterForm: React.FC<LocationMasterFormProps> = ({ initialData, onClose, onSuccess }) => {
  const [cities, setCities] = useState<City[]>([]);
  const [agencies, setAgencies] = useState<Agency[]>([]);

  const form = useForm<LocationFormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: initialData?.name || '',
      cityId: initialData?.cityId,
      agencyId: initialData?.agencyId || null,
    },
  });

  const { register, handleSubmit, reset, setValue, watch, formState: { errors, isSubmitting } } = form;

  useEffect(() => {
    const fetchDependencies = async () => {
      try {
        const [citydata, Agencydata] = await Promise.all([
          getCitiesList(),
          getAgenciesList(),
        ]);
        setCities(citydata);
        setAgencies(Agencydata);
      } catch (error) {
        toast.error('Failed to fetch cities or agencies');
      }
    };
    fetchDependencies();
  }, []);

  useEffect(() => {
    if (initialData) {
      reset({
        name: initialData.name,
        cityId: initialData.cityId,
        agencyId: initialData.agencyId || null,
      });
    } else {
      reset({ name: '', cityId: undefined, agencyId: null });
    }
  }, [initialData, reset]);

  const onSubmit = async (values: LocationFormData) => {
    try {
      const result = await (initialData?.id
        ? updateLocation(initialData.id, values)
        : createLocation(values));
      toast.success(`Location ${initialData?.id ? 'updated' : 'created'} successfully!`);
      onSuccess(result);
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'An unexpected error occurred';
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
        <Select
          onValueChange={(value) => setValue('cityId', parseInt(value, 10))}
          value={watch('cityId')?.toString() || ''}
        >
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

      <div className="grid gap-2">
        <Label>Agency</Label>
                <Select
          onValueChange={(value) => setValue('agencyId', value === 'null' ? null : parseInt(value, 10))}
          value={watch('agencyId') != null ? String(watch('agencyId')) : 'null'}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select an agency" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="null">None</SelectItem>
            {agencies.map(agency => (
              <SelectItem key={agency.id} value={agency.id.toString()}>
                {agency.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.agencyId && <p className="text-sm text-red-600 mt-1">{errors.agencyId.message}</p>}
      </div>

      <div className="flex justify-end space-x-3 pt-4">
        <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting} className="gap-2">
          {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {isSubmitting ? 'Saving...' : 'Save'}
        </Button>
      </div>
    </form>
  );
};

export default LocationMasterForm;
