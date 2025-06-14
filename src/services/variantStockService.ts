import { get } from './apiService';

export interface VariantStock {
  id: number;
  productId: number;
  variantId: number;
  depotId: number;
  closingQty: string;
  product: { id: number; name: string };
  variant: { id: number; name: string };
  depot: { id: number; name: string };
}

export interface PaginatedVariantStockResponse {
  data: VariantStock[];
  currentPage: number;
  totalPages: number;
  totalRecords: number;
}

export const getVariantStocks = async (
  params: {
    depotId: number;
    page?: number;
    limit?: number;
    search?: string;
  }
): Promise<PaginatedVariantStockResponse> => {
  return get<PaginatedVariantStockResponse>('/variant-stocks', params);
};
