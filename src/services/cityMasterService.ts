import {get, post,put, del} from './apiService';

export interface City {
  id: number;
  name: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface PaginatedCitiesResponse {
  cities: City[];
  currentPage: number;
  totalPages: number;
  totalRecords: number;
}

const API_BASE_URL = '/api/admin/cities';

export const getAllCities = async (
  params: {
    page?: number;
    limit?: number;
    search?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  } = {}
): Promise<PaginatedCitiesResponse> => {
  try {
    const response = await get<PaginatedCitiesResponse>(API_BASE_URL, params);
    return response;
  } catch (error) {
    console.error('Failed to fetch cities:', error);
    throw error;
  }
};

export const getCitiesList = async (): Promise<City[]> => {
  try {
    const response = await get<PaginatedCitiesResponse>(API_BASE_URL, { limit: 1000 }); // Fetch a large number to get all cities
    return response.cities;
  } catch (error) {
    console.error('Failed to fetch cities list:', error);
    throw error;
  }
};

export const createCity = async (data: { name: string }): Promise<City> => {
  try {
    const response = await post<City>(API_BASE_URL, data);
    return response;
  } catch (error) {
    console.error('Failed to create city:', error);
    throw error;
  }
};

export const updateCity = async (id: number, data: { name: string }): Promise<City> => {
  try {
    const response = await put<City>(`${API_BASE_URL}/${id}`, data);
    return response;
  } catch (error) {
    console.error(`Failed to update city ${id}:`, error);
    throw error;
  }
};

export const deleteCity = async (id: number): Promise<void> => {
  try {
    await del(`${API_BASE_URL}/${id}`);
  } catch (error) {
    console.error(`Failed to delete city ${id}:`, error);
    throw error;
  }
};
