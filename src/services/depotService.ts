import { get } from './apiService';

export interface Depot {
  id: number;
  name: string;
  address: string;
  city: string;
  contactPerson?: string;
  contactNumber?: string;
}

export interface DepotListItem {
  id: number;
  name: string;
}

export const getAllDepots = async (page = 1, limit = 10, search = '', sortBy = 'name', sortOrder = 'asc'): Promise<{ depots: Depot[]; totalPages: number; totalRecords: number; }> => {
  const response = await get('/admin/depots', {
    page,
    limit,
    search,
    sortBy,
    sortOrder,
  });
  return response;
};

export const getAllDepotsList = async (): Promise<DepotListItem[]> => {
  return get('/admin/depots/all-list');
};
