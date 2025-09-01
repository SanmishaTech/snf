import { get, post } from './apiService';
import { DepotProductVariant } from './depotProductVariantService';

export interface UnitConversionRequest {
  sourceVariantId: number;
  targetVariantId: number;
  sourceQuantity: number;
  targetQuantity: number;
  depotId: number;
}

export interface UnitConversionResponse {
  success: boolean;
  message: string;
  sourceVariant: {
    id: number;
    name: string;
    previousStock: number;
    newStock: number;
  };
  targetVariant: {
    id: number;
    name: string;
    previousStock: number;
    newStock: number;
  };
}

export interface ConversionHistory {
  id: number;
  depotId: number;
  sourceVariantId: number;
  targetVariantId: number;
  sourceQuantity: number;
  targetQuantity: number;
  sourceVariantName: string;
  targetVariantName: string;
  performedBy: string;
  performedAt: string;
  notes?: string;
}

export interface PaginatedConversionHistoryResponse {
  data: ConversionHistory[];
  currentPage: number;
  totalPages: number;
  totalRecords: number;
}

const API_BASE_URL = '/admin/unit-conversion';

// Get depot product variants for a specific depot (using existing endpoint as fallback)
export const getDepotVariantsForConversion = async (depotId: number): Promise<DepotProductVariant[]> => {
  try {
    // Try the new unit conversion endpoint first
    return await get<DepotProductVariant[]>(`${API_BASE_URL}/depot/${depotId}/variants`);
  } catch (error) {
    // Fallback to existing depot-product-variants endpoint
    const response = await get<{ data: DepotProductVariant[] }>('/admin/depot-product-variants', { 
      depotId,
      limit: 1000 
    });
    return response.data || [];
  }
};

// Get variants for a specific product within a depot (using existing endpoint as fallback)
export const getProductVariantsInDepot = async (depotId: number, productId: number): Promise<DepotProductVariant[]> => {
  try {
    // Try the new unit conversion endpoint first
    return await get<DepotProductVariant[]>(`${API_BASE_URL}/depot/${depotId}/product/${productId}/variants`);
  } catch (error) {
    // Fallback to existing depot-product-variants endpoint with product filter
    const response = await get<{ data: DepotProductVariant[] }>('/admin/depot-product-variants', { 
      depotId,
      productId,
      limit: 1000 
    });
    return response.data || [];
  }
};

// Perform unit conversion (placeholder until backend is implemented)
export const performUnitConversion = async (conversionData: UnitConversionRequest): Promise<UnitConversionResponse> => {
  try {
    return await post<UnitConversionResponse>(`${API_BASE_URL}/convert`, conversionData);
  } catch (error) {
    // Placeholder response until backend is implemented
    throw new Error('Unit conversion backend not implemented yet. Please implement the API endpoints first.');
  }
};

// Get conversion history (placeholder until backend is implemented)
export const getConversionHistory = async (params: {
  page?: number;
  limit?: number;
  depotId?: number;
  startDate?: string;
  endDate?: string;
} = {}): Promise<PaginatedConversionHistoryResponse> => {
  try {
    return await get<PaginatedConversionHistoryResponse>(`${API_BASE_URL}/history`, params);
  } catch (error) {
    // Return empty history until backend is implemented
    return {
      data: [],
      currentPage: 1,
      totalPages: 1,
      totalRecords: 0
    };
  }
};

// Validate conversion before performing (client-side validation until backend is ready)
export const validateConversion = async (conversionData: UnitConversionRequest): Promise<{
  isValid: boolean;
  errors: string[];
  warnings: string[];
}> => {
  try {
    return await post<{
      isValid: boolean;
      errors: string[];
      warnings: string[];
    }>(`${API_BASE_URL}/validate`, conversionData);
  } catch (error) {
    // Client-side validation as fallback
    const errors: string[] = [];
    const warnings: string[] = [];

    if (conversionData.sourceQuantity <= 0) {
      errors.push('Source quantity must be greater than 0');
    }
    
    if (conversionData.targetQuantity <= 0) {
      errors.push('Target quantity must be greater than 0');
    }

    if (conversionData.sourceVariantId === conversionData.targetVariantId) {
      errors.push('Source and target variants cannot be the same');
    }

    if (errors.length === 0) {
      warnings.push('Backend validation not available. Only basic client-side validation performed.');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }
};

// Get conversion suggestions (placeholder until backend is implemented)
export const getConversionSuggestions = async (sourceVariantId: number): Promise<{
  targetVariant: DepotProductVariant;
  suggestedRatio: number;
  description: string;
}[]> => {
  try {
    return await get<{
      targetVariant: DepotProductVariant;
      suggestedRatio: number;
      description: string;
    }[]>(`${API_BASE_URL}/suggestions/${sourceVariantId}`);
  } catch (error) {
    // Return empty suggestions until backend is implemented
    return [];
  }
};

// Bulk conversion for multiple variants
export interface BulkConversionRequest {
  depotId: number;
  conversions: {
    sourceVariantId: number;
    targetVariantId: number;
    sourceQuantity: number;
    targetQuantity: number;
  }[];
  notes?: string;
}

export const performBulkConversion = async (bulkData: BulkConversionRequest): Promise<{
  success: boolean;
  results: UnitConversionResponse[];
  errors: string[];
}> => {
  return await post<{
    success: boolean;
    results: UnitConversionResponse[];
    errors: string[];
  }>(`${API_BASE_URL}/bulk-convert`, bulkData);
};
