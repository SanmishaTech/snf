import { get, post, put, del } from './apiService';

export interface DepotProductVariant {
  id: number;
  depotId: number;
  productId: number;
  productName?: string; // populated from backend include?
  name: string;
  hsnCode?: string;
  mrp: number;
  minimumQty: number;
  price3Day?: number;
  price7Day?: number;
  price15Day?: number;
  price1Month?: number;
  closingQty: number;
  depot?: { id: number; name: string };
  notInStock: boolean;
  isHidden: boolean;
  buyOncePrice?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface PaginatedDepotVariantsResponse {
  data: DepotProductVariant[];
  currentPage: number;
  totalPages: number;
  totalRecords: number;
}

const API_BASE_URL = '/admin/depot-product-variants';

export const getDepotProductVariants = async (params: {
  page?: number;
  limit?: number;
  productId?: number;
} = {}): Promise<PaginatedDepotVariantsResponse> => {
  return await get<PaginatedDepotVariantsResponse>(API_BASE_URL, params);
};

export const createDepotProductVariant = async (data: Partial<DepotProductVariant>): Promise<DepotProductVariant> => {
  return await post<DepotProductVariant>(API_BASE_URL, data);
};

export const updateDepotProductVariant = async (id: number, data: Partial<DepotProductVariant>): Promise<DepotProductVariant> => {
  return await put<DepotProductVariant>(`${API_BASE_URL}/${id}`, data);
};

export const deleteDepotProductVariant = async (id: number): Promise<void> => {
  await del(`${API_BASE_URL}/${id}`);
};
