import {get, post,put, del} from './apiService';
import { Agency } from './agencyService';

export interface AgencyLocation {
  agencyId: number;
  locationId: number;
  agency: {
    id: number;
    name: string;
  };
}

export interface Location {
  id: number;
  name: string;
  cityId: number;
  city: {
    id: number;
    name: string;
  };
  agencyId?: number | null;
  agency?: Agency | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface PaginatedLocationsResponse {
  locations: Location[];
  currentPage: number;
  totalPages: number;
  totalRecords: number;
}

const API_BASE_URL = '/api/admin/locations';

export const getAllLocations = async (
  params: {
    page?: number;
    limit?: number;
    search?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  } = {}
): Promise<PaginatedLocationsResponse> => {
  try {
    const response = await get<PaginatedLocationsResponse>(API_BASE_URL, params);
    return response;
  } catch (error) {
    console.error('Failed to fetch locations:', error);
    throw error;
  }
};

export const createLocation = async (data: { name: string, cityId: number }): Promise<Location> => {
  try {
    const response = await post<Location>(API_BASE_URL, data);
    return response;
  } catch (error) {
    console.error('Failed to create location:', error);
    throw error;
  }
};

export const updateLocation = async (id: number, data: { name: string, cityId: number }): Promise<Location> => {
  try {
    const response = await put<Location>(`${API_BASE_URL}/${id}`, data);
    return response;
  } catch (error) {
    console.error(`Failed to update location ${id}:`, error);
    throw error;
  }
};

export const deleteLocation = async (id: number): Promise<void> => {
  try {
    await del(`${API_BASE_URL}/${id}`);
  } catch (error) {
    console.error(`Failed to delete location ${id}:`, error);
    throw error;
  }
};
