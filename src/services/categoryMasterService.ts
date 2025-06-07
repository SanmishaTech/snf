import {get, post,put, del} from './apiService'; // Assuming 'api.ts' is your configured axios instance

export interface Category {
  id: number; // Or string, if your backend uses UUIDs etc.
  name: string;
  isPerishable: boolean;
  isDairy: boolean;
  imageUrl?: string;
  createdAt?: string; // Optional: if your backend sends these
  updatedAt?: string; // Optional: if your backend sends these
}

// CategoryFormData is now defined in CategoryMasterForm.tsx using Zod

export interface PaginatedCategoriesResponse {
  categories: Category[];
  currentPage: number;
  totalPages: number;
  totalRecords: number;
}

const API_BASE_URL = '/admin/categories'; // Adjust if your API prefix is different

export const getAllCategories = async (
params: {
    page?: number;
    limit?: number;
    search?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  } = {}
): Promise<PaginatedCategoriesResponse> => {
  try {
    const response = await get<PaginatedCategoriesResponse>(API_BASE_URL, params);
    return response; // response from apiService.get is already the data payload
  } catch (error) {
    console.error('Failed to fetch categories:', error);
    throw error;
  }
};

export const createCategory = async (data: FormData): Promise<Category> => {
  try {
    const response = await post<Category>(API_BASE_URL, data);
    return response;
  } catch (error) {
    console.error('Failed to create category:', error);
    throw error;
  }
};

export const updateCategory = async (id: number, data: FormData): Promise<Category> => {
  try {
    const response = await put<Category>(`${API_BASE_URL}/${id}`, data);
    return response;
  } catch (error) {
    console.error(`Failed to update category ${id}:`, error);
    throw error;
  }
};

export const deleteCategory = async (id: number): Promise<void> => {
  try {
    await del(`${API_BASE_URL}/${id}`);
  } catch (error) {
    console.error(`Failed to delete category ${id}:`, error);
    throw error;
  }
};
