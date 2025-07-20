import { get, post, put, del } from './apiService';

// Interface for Lead entity
export interface Lead {
  id: number;
  name: string;
  mobile: string;
  email?: string;
  plotBuilding: string;
  streetArea: string;
  landmark?: string;
  pincode: string;
  city: string;
  state: string;
  productId?: number;
  isDairyProduct: boolean;
  notes?: string;
  status: 'NEW' | 'CONTACTED' | 'CONVERTED' | 'CLOSED';
  createdAt: string;
  updatedAt: string;
}

// Interface for creating a new lead
export interface CreateLeadData {
  name: string;
  mobile: string;
  email?: string;
  plotBuilding: string;
  streetArea: string;
  landmark?: string;
  pincode: string;
  city: string;
  state: string;
  productId?: number;
  isDairyProduct: boolean;
  notes?: string;
}

// Interface for lead API response
export interface LeadApiResponse {
  success: boolean;
  message?: string;
  data?: Lead | {
    leads: Lead[];
    page: number;
    totalPages: number;
    totalRecords: number;
  };
}

/**
 * Create a new lead (public endpoint - no auth required)
 * @param leadData - The lead data to submit
 * @returns Promise resolving to the created lead
 */
export const createLead = async (leadData: CreateLeadData): Promise<Lead> => {
  const response = await post<LeadApiResponse>('/api/leads', leadData);
  if (!response.success || !response.data) {
    throw new Error(response.message || 'Failed to create lead');
  }
  return response.data as Lead;
};

/**
 * Get all leads with pagination and filtering (admin only)
 * @param params - Query parameters for pagination and filtering
 * @returns Promise resolving to paginated leads
 */
export const getAllLeads = async (params: {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  isDairyProduct?: boolean;
}): Promise<{
  leads: Lead[];
  page: number;
  totalPages: number;
  totalRecords: number;
}> => {
  const response = await get<LeadApiResponse>('/api/leads', params);
  if (!response.success || !response.data) {
    throw new Error(response.message || 'Failed to fetch leads');
  }
  return response.data as {
    leads: Lead[];
    page: number;
    totalPages: number;
    totalRecords: number;
  };
};

/**
 * Get a single lead by ID (admin only)
 * @param id - Lead ID
 * @returns Promise resolving to the lead
 */
export const getLeadById = async (id: number): Promise<Lead> => {
  const response = await get<LeadApiResponse>(`/api/leads/${id}`);
  if (!response.success || !response.data) {
    throw new Error(response.message || 'Failed to fetch lead');
  }
  return response.data as Lead;
};

/**
 * Update lead status (admin only)
 * @param id - Lead ID
 * @param status - New status
 * @param notes - Optional notes
 * @returns Promise resolving to the updated lead
 */
export const updateLeadStatus = async (
  id: number,
  status: Lead['status'],
  notes?: string
): Promise<Lead> => {
  const response = await put<LeadApiResponse>(`/api/leads/${id}/status`, {
    status,
    notes,
  });
  if (!response.success || !response.data) {
    throw new Error(response.message || 'Failed to update lead status');
  }
  return response.data as Lead;
};

/**
 * Delete a lead (admin only)
 * @param id - Lead ID
 * @returns Promise resolving to success message
 */
export const deleteLead = async (id: number): Promise<string> => {
  const response = await del<LeadApiResponse>(`/api/leads/${id}`);
  if (!response.success) {
    throw new Error(response.message || 'Failed to delete lead');
  }
  return response.message || 'Lead deleted successfully';
};