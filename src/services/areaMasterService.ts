import { get, post, put, del } from './apiService';

// Corresponds to DeliveryType enum in Prisma
export enum DeliveryType {
  HandDelivery = 'HandDelivery',
  Courier = 'Courier',
}

// Interface for the AreaMaster entity
export interface AreaMaster {
  id: number;
  name: string;
  pincodes: string; // Comma-separated string
  depotId?: string | null; // Optional - depot is now optional
  depot?: { id: string; name: string; } | null; // Optional depot object
  cityId?: number | null; // Added city association
  city?: { id: number; name: string; } | null; // Added city object
  deliveryType: DeliveryType;
  isDairyProduct: boolean; // Flag to indicate if area supports dairy products
  deliverySchedule: string[]; // Array of delivery schedule options
  createdAt: string; // ISO date string
  updatedAt: string; // ISO date string
}

// Interface for form data when creating/updating an AreaMaster
export interface AreaMasterFormData {
  name: string;
  pincodes: string;
  depotId?: string | null; // Optional depot
  cityId?: number | null; // Added city association
  deliveryType: DeliveryType;
  isDairyProduct: boolean;
  deliverySchedule: string[]; // Array of delivery schedule options
}

// Interface for a simplified Depot object (for dropdowns)
export interface DepotLite {
  id: string;
  name: string;
}

// Interface for the API response when fetching multiple AreaMasters (paginated)
export interface AreaMasterApiResponse {
  areaMasters: AreaMaster[];
  page: number;
  totalPages: number;
  totalRecords: number;
  message?: string; // Optional message (e.g., if no records found)
}

const API_BASE_URL = '/admin/areamasters'; // Base URL for AreaMaster admin routes

/**
 * Create a new AreaMaster.
 * @param data - The data for the new AreaMaster.
 * @returns The created AreaMaster.
 */
export const createAreaMaster = async (data: AreaMasterFormData): Promise<AreaMaster> => {
  return post<AreaMaster>(API_BASE_URL, data);
};

/**
 * Get all AreaMasters with pagination, search, and sorting.
 * @param params - Query parameters for pagination, search, and sorting.
 * @returns A paginated list of AreaMasters.
 */
export const getAllAreaMasters = async (params: {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}): Promise<AreaMasterApiResponse> => {
  return get<AreaMasterApiResponse>(API_BASE_URL, params);
};

/**
 * Get a single AreaMaster by its ID.
 * @param id - The ID of the AreaMaster.
 * @returns The requested AreaMaster.
 */
export const getAreaMasterById = async (id: number): Promise<AreaMaster> => {
  return get<AreaMaster>(`${API_BASE_URL}/${id}`);
};

/**
 * Update an existing AreaMaster.
 * @param id - The ID of the AreaMaster to update.
 * @param data - The partial data to update the AreaMaster with.
 * @returns The updated AreaMaster.
 */
export const updateAreaMaster = async (
  id: number,
  data: Partial<AreaMasterFormData>
): Promise<AreaMaster> => {
  return put<AreaMaster>(`${API_BASE_URL}/${id}`, data);
};

/**
 * Delete an AreaMaster by its ID.
 * @param id - The ID of the AreaMaster to delete.
 * @returns A confirmation message.
 */
export const deleteAreaMaster = async (id: number): Promise<{ message: string }> => {
  return del<{ message: string }>(`${API_BASE_URL}/${id}`);
};

/**
 * Get all depots (simplified list for dropdowns).
 * @returns A list of depots with id and name.
 */
export const getAllDepots = async (): Promise<DepotLite[]> => {
  return get<DepotLite[]>('/admin/depots/all-list'); // Assumes a new endpoint that returns all depots
};

// Public API functions for frontend consumption

/**
 * Get all public area masters for frontend dropdown
 * @returns A list of all area masters
 */
export const getPublicAreaMasters = async (): Promise<AreaMaster[]> => {
  const response = await get<{ success: boolean; data: AreaMaster[] }>('/api/public/area-masters');
  return response.data;
};

/**
 * Validate if an area supports dairy products by pincode
 * @param pincode - The pincode to validate
 * @returns Validation result with support information
 */
export const validateDairySupport = async (pincode: string): Promise<{
  success: boolean;
  supported: boolean;
  message: string;
  areas: AreaMaster[];
  dairySupportedAreas?: AreaMaster[];
}> => {
  return get<{
    success: boolean;
    supported: boolean;
    message: string;
    areas: AreaMaster[];
    dairySupportedAreas?: AreaMaster[];
  }>(`/api/public/area-masters/validate-dairy/${pincode}`);
};

/**
 * Get area masters by pincode
 * @param pincode - The pincode to search for
 * @returns Area masters that service this pincode
 */
export const getAreaMastersByPincode = async (pincode: string): Promise<AreaMaster[]> => {
  const response = await get<{ success: boolean; data: AreaMaster[]; count: number }>(`/api/public/area-masters/by-pincode/${pincode}`);
  return response.data;
};

/**
 * Filter area masters by city ID
 * @param areas - Array of area masters to filter
 * @param cityId - City ID to filter by
 * @returns Area masters that belong to the specified city
 */
export const filterAreaMastersByCity = (areas: AreaMaster[], cityId: number | null): AreaMaster[] => {
  if (!cityId) return areas;
  return areas.filter(area => area.cityId === cityId);
};

/**
 * Validate if a pincode is served by any of the provided area masters
 * @param pincode - The pincode to validate
 * @param areas - Array of area masters to check against
 * @returns Validation result with details
 */
/**
 * Parse pincodes from various formats (JSON array, comma-separated, semicolon-separated, pipe-separated, space-separated)
 */
const parsePincodes = (pincodes: string): string[] => {
  if (!pincodes || pincodes.trim() === '') return [];
  
  // Try to parse as JSON array first
  try {
    const parsed = JSON.parse(pincodes);
    if (Array.isArray(parsed)) {
      return parsed.map(p => String(p).trim()).filter(Boolean);
    }
  } catch {
    // Not JSON, continue with string processing
  }
  
  // Check if it contains commas or other separators
  if (pincodes.includes(',')) {
    return pincodes.split(',').map(p => p.trim()).filter(Boolean);
  } else if (pincodes.includes(';')) {
    return pincodes.split(';').map(p => p.trim()).filter(Boolean);
  } else if (pincodes.includes('|')) {
    return pincodes.split('|').map(p => p.trim()).filter(Boolean);
  } else {
    // Single pincode or space-separated
    const spaceSeparated = pincodes.trim().split(/\s+/);
    if (spaceSeparated.length > 1) {
      return spaceSeparated.filter(Boolean);
    }
    // Single pincode
    return [pincodes.trim()];
  }
};

export const validatePincodeInAreas = (pincode: string, areas: AreaMaster[]): {
  isValid: boolean;
  matchedAreas: AreaMaster[];
  message: string;
} => {
  if (!pincode || pincode.length !== 6 || !/^\d{6}$/.test(pincode)) {
    return {
      isValid: false,
      matchedAreas: [],
      message: 'Please enter a valid 6-digit pincode'
    };
  }

  const matchedAreas = areas.filter(area => {
    const areaPincodes = parsePincodes(area.pincodes);
    return areaPincodes.includes(pincode);
  });

  if (matchedAreas.length > 0) {
    return {
      isValid: true,
      matchedAreas,
      message: `Great! We deliver to ${pincode}`
    };
  } else {
    return {
      isValid: false,
      matchedAreas: [],
      message: `We currently do not serve ${pincode}, but we're expanding!`
    };
  }
};

/**
 * Check if an area master supports dairy products for a given product type
 * @param areaMaster - The area master to check
 * @param isDairyProduct - Whether the product is a dairy product
 * @returns Whether the area can serve this product type
 */
export const canAreaServeProduct = (areaMaster: AreaMaster, isDairyProduct: boolean): {
  canServe: boolean;
  reason?: string;
} => {
  if (isDairyProduct && !areaMaster.isDairyProduct) {
    return {
      canServe: false,
      reason: `${areaMaster.name} does not currently support dairy product deliveries`
    };
  }
  
  return { canServe: true };
};
