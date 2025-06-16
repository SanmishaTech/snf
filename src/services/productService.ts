import { get } from './apiService';

export interface ProductOption {
  id: number;
  name: string;
}

// Fetch lightweight list of products for dropdowns (id & name only).
export const getProductOptions = async (): Promise<ProductOption[]> => {
  // Assumes backend supports selecting minimal fields via query, otherwise full objects are fine.
  // e.g. GET /api/products?select=id,name&limit=1000
  const res = await get<{ data: ProductOption[] }>(`/products`, { select: 'id,name', limit: 1000 });
  // If backend returns array directly adjust accordingly
  return (res as any).data ?? res;
};
