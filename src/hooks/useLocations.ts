import { useQuery } from '@tanstack/react-query';
import { get } from '@/services/apiService';

interface City {
  id: number;
  name: string;
}

interface Location {
  id: number;
  name: string;
  cityId: number;
  city: City;
}

interface LocationsResponse {
  success: boolean;
  data: {
    locations: Location[];
    total: number;
  };
}

export const useLocations = () => {
  const fetchLocations = async (): Promise<Location[]> => {
    const response = await get<LocationsResponse>('/public/locations');
    return response.data.locations;
  };

  return useQuery<Location[], Error>({
    queryKey: ['locations'],
    queryFn: fetchLocations,
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
  });
};

export type { Location, City };
