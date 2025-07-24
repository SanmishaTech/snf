import { get, post, put, del } from './apiService';

export interface SupervisorUser {
  id: number;
  name: string;
  email: string;
  role: string;
  active: boolean;
}

export interface SupervisorDepot {
  id: number;
  name: string;
}

export interface Supervisor {
  id: number;
  name: string;
  contactPersonName?: string;
  mobile: string;
  address1: string;
  address2?: string;
  city: string;
  pincode: number;
  alternateMobile?: string;
  email?: string;
  userId: number;
  depotId?: number;
  createdAt: string;
  updatedAt: string;
  user: SupervisorUser;
  depot?: SupervisorDepot;
}

export interface CreateSupervisorData {
  name: string;
  contactPersonName?: string;
  address1: string;
  address2?: string;
  city?: string;
  pincode: string | number;
  mobile: string;
  alternateMobile?: string;
  email?: string;
  depotId?: number;
  userFullName: string;
  userLoginEmail?: string;
  userPassword: string;
}

export interface UpdateSupervisorData {
  name: string;
  contactPersonName?: string;
  address1: string;
  address2?: string;
  city?: string;
  pincode: string | number;
  mobile: string;
  alternateMobile?: string;
  email?: string;
  depotId?: number;
}

export interface SupervisorListResponse {
  data: Supervisor[];
  totalPages: number;
  totalRecords: number;
  currentPage: number;
}

export interface SupervisorListParams {
  page?: number;
  limit?: number;
  search?: string;
  active?: 'all' | 'true' | 'false';
  sortBy?: 'name' | 'email' | 'city' | 'createdAt' | 'updatedAt';
  sortOrder?: 'asc' | 'desc';
}

// Get all supervisors with pagination and filters
export const getSupervisors = async (params: SupervisorListParams = {}): Promise<SupervisorListResponse> => {
  const {
    page = 1,
    limit = 10,
    search = '',
    active = 'all',
    sortBy = 'name',
    sortOrder = 'asc'
  } = params;

  const queryParams = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
    search,
    active,
    sortBy,
    sortOrder
  });

  return await get<SupervisorListResponse>(`/supervisors?${queryParams.toString()}`);
};

// Get supervisors list (for dropdowns/selects)
export const getSupervisorsList = async (): Promise<Supervisor[]> => {
  const response = await get<SupervisorListResponse>('/supervisors', {
    params: { limit: 1000 }, // Fetch a large number for list purposes
  });
  return response.data || [];
};

// Get single supervisor by ID
export const getSupervisorById = async (id: number): Promise<Supervisor> => {
  return await get<Supervisor>(`/supervisors/${id}`);
};

// Create new supervisor
export const createSupervisor = async (data: CreateSupervisorData): Promise<Supervisor> => {
  return await post<Supervisor>('/supervisors', data);
};

// Update supervisor
export const updateSupervisor = async (id: number, data: UpdateSupervisorData): Promise<Supervisor> => {
  return await put<Supervisor>(`/supervisors/${id}`, data);
};

// Delete supervisor
export const deleteSupervisor = async (id: number): Promise<{ message: string }> => {
  return await del<{ message: string }>(`/supervisors/${id}`);
};

// Toggle supervisor active status (via user)
export const toggleSupervisorStatus = async (userId: number, active: boolean): Promise<any> => {
  return await put(`/users/${userId}`, { active });
};

// Change supervisor password (via user)
export const changeSupervisorPassword = async (userId: number, newPassword: string): Promise<any> => {
  return await put(`/users/${userId}/password`, { password: newPassword });
};