import { get, post, put, del as deleteRequest } from './apiService';

export interface Category {
  id: number;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
}

export interface CategoryListResponse {
  categories: Category[];
  page: number;
  totalPages: number;
  totalCategories: number;
}

export const getCategories = async (
  page = 1,
  limit = 10,
  search = '',
  sortBy = 'name',
  sortOrder = 'asc'
): Promise<CategoryListResponse> => {
  return await get('/categories', { page, limit, search, sortBy, sortOrder });
};

export const getCategoryById = async (id: number): Promise<Category> => {
  return await get(`/categories/${id}`);
};

export const createCategory = async (data: Omit<Category, 'id' | 'createdAt' | 'updatedAt'>): Promise<Category> => {
  return await post('/categories', data, {});
};

export const updateCategory = async (
  id: number,
  data: Partial<Omit<Category, 'id' | 'createdAt' | 'updatedAt'>>
): Promise<Category> => {
  return await put(`/categories/${id}`, data, {});
};

export const deleteCategory = async (id: number): Promise<{ message: string }> => {
  return await deleteRequest(`/categories/${id}`);
};

export default {
  getCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
}; 