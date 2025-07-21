import { useQuery } from '@tanstack/react-query';
import { get } from '@/services/apiService';

export interface AreaMaster {
  id: number;
  name: string;
  pincodes: string;
  deliveryType: 'HandDelivery' | 'Courier';
  isDairyProduct: boolean;
  depot?: {
    id: number;
    name: string;
    address: string;
    isOnline: boolean;
    contactPerson?: string;
    contactNumber?: string;
  };
  createdAt: string;
  updatedAt: string;
}

interface AreaMastersResponse {
  success: boolean;
  data: AreaMaster[];
}

export const useAreaMasters = () => {
  const fetchAreaMasters = async (): Promise<AreaMaster[]> => {
    const response = await get<AreaMastersResponse>('/api/public/area-masters');
    return response.data || response; // Handle different response formats
  };

  return useQuery<AreaMaster[], Error>({
    queryKey: ['area-masters'],
    queryFn: fetchAreaMasters,
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
  });
};