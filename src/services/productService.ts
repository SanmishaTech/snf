import { get } from './apiService';

export interface ProductOption {
  id: number;
  name: string;
  isSubscription: boolean;
}

// Fetch lightweight list of products for dropdowns (id & name only).
export const getProductOptions = async (search?: string): Promise<ProductOption[]> => {
  // Assumes backend supports selecting minimal fields via query, otherwise full objects are fine.
  // e.g. GET /api/products?select=id,name,isSubscription&limit=1000
  const params: any = { select: 'id,name,isSubscription', limit: 1000 };
  if (search) params.search = search;
  const res = await get<{ data: ProductOption[] }>(`/products`, params);
  // If backend returns array directly adjust accordingly
  return (res as any).data ?? res;
};
