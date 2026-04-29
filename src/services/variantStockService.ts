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
    isDairy?: string;
  }
): Promise<PaginatedVariantStockResponse> => {
  // Query parameters mapping
  const queryParams: any = {
    depotId: params.depotId,
    page: params.page,
    limit: params.limit,
    search: params.search,
    isDairy: params.isDairy,
  };
  
  const res = await get<any>('/depot-product-variants', queryParams);
  
  return {
    currentPage: res.currentPage || 1,
    totalPages: res.totalPages || 1,
    totalRecords: res.totalRecords || 0,
    data: (res.data || []).map((v: any) => ({
      id: v.id,
      productId: v.productId,
      variantId: v.id,
      depotId: v.depotId,
      closingQty: (v.closingQty || 0).toString(),
      product: v.product || { id: v.productId, name: 'N/A' },
      variant: { id: v.id, name: v.name || 'N/A' },
      depot: v.depot || { id: v.depotId, name: 'N/A' }
    }))
  };
};
