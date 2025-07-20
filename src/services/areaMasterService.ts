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
  depotId?: string | null; // Changed to string
  depot?: { id: string; name: string; } | null; // Added depot object
  deliveryType: DeliveryType;
  isDairyProduct: boolean; // Flag to indicate if area supports dairy products
  createdAt: string; // ISO date string
  updatedAt: string; // ISO date string
}

// Interface for form data when creating/updating an AreaMaster
export interface AreaMasterFormData {
  name: string;
  pincodes: string;
  depotId?: string | null; // Changed to string
  deliveryType: DeliveryType;
  isDairyProduct: boolean;
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
