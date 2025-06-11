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
  return await get('/admin/categories', { page, limit, search, sortBy, sortOrder });
};

export const getCategoryById = async (id: number): Promise<Category> => {
  return await get(`/admin/categories/${id}`);
};

export const getAllCategories = async (): Promise<Category[]> => {
  // We ask for a large limit to fetch all categories, assuming there won't be more than 1000.
  // This avoids implementing a separate non-paginated endpoint for now.
  const response = await get('/admin/categories?limit=1000');
  return response.categories; // Assuming the API returns { categories: [...] }
};

export const createCategory = async (data: Omit<Category, 'id' | 'createdAt' | 'updatedAt'>): Promise<Category> => {
  return await post('/admin/categories', data);
};

export const updateCategory = async (
  id: number,
  data: Partial<Omit<Category, 'id' | 'createdAt' | 'updatedAt'>>
): Promise<Category> => {
  return await put(`/admin/categories/${id}`, data);
};

export const deleteCategory = async (id: number): Promise<{ message: string }> => {
  return await deleteRequest(`/admin/categories/${id}`);
};

export default {
  getCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
}; 