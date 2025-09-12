import { get } from './apiService';

export interface ProductOption {
  id: number;
  name: string;
}

// Fetch all products for dropdown options (admin endpoint).
export const getProductOptions = async (): Promise<ProductOption[]> => {
  const res = await get<{ data: any[] }>(`/admin/products`, { limit: 1000 });
  // Extract just id and name from the full product objects
  return (res.data || []).map(p => ({ id: p.id, name: p.name }));
};
