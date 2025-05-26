import { get, post, put, del as deleteRequest } from './apiService';

export interface Category {
  id: number;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
}

export interface SubCategory {
  id: number;
  name: string;
  categoryId: number;
  createdAt: string;
  updatedAt: string;
}

export interface CategoryListResponse {
  categories: Category[];
  page: number;
  totalPages: number;
  totalCategories: number;
}

export interface SubCategoryListResponse {
  subcategories: SubCategory[];
  page: number;
  totalPages: number;
  totalSubCategories: number;
}

export const getSubCategories = async (
  page = 1,
  limit = 10,
  search = '',
  sortBy = 'name',
  sortOrder = 'asc'
): Promise<SubCategoryListResponse> => {
  return await get('/subcategories', { page, limit, search, sortBy, sortOrder });
};

export const getSubCategoryById = async (id: number): Promise<SubCategory> => {
  return await get(`/subcategories/${id}`);
};

export const createSubCategory = async (data: Omit<SubCategory, 'id' | 'createdAt' | 'updatedAt'>): Promise<SubCategory> => {
  return await post('/subcategories', data);
};

export const updateSubCategory = async (id: number, data: Partial<Omit<SubCategory, 'id' | 'createdAt' | 'updatedAt'>>): Promise<SubCategory> => {
  return await put(`/subcategories/${id}`, data);
};

export const deleteSubCategory = async (id: number): Promise<void> => {
  return await deleteRequest(`/subcategories/${id}`);
};

// New function to get subcategories by category ID
export const getSubCategoriesByCategoryId = async (categoryId: number): Promise<SubCategory[]> => {
  console.log('[subCategoryService] Fetching subcategories for categoryId:', categoryId);
  try {
    const response = await get(`/subcategories`, { categoryId });
    console.log('[subCategoryService] Raw API response for subcategories:', response);

    let subcategories: SubCategory[] = [];

    if (Array.isArray(response)) {
      subcategories = response;
    } else if (response && Array.isArray(response.categories)) { 
      subcategories = response.categories;
    } else if (response && Array.isArray(response.data)) {
      subcategories = response.data;
    } else if (response && response.data && Array.isArray(response.data.subcategories)) { 
      subcategories = response.data.subcategories;
    } else if (response && response.data && Array.isArray(response.data.categories)) { 
      subcategories = response.data.categories;
    } else {
      console.warn('[subCategoryService] Subcategories data not found in expected format in response. API response:', response);
    }
    
    if (subcategories.length > 0 && categoryId) {
        const filteredSubcategories = subcategories.filter(sub => sub.categoryId === categoryId);
        if (filteredSubcategories.length !== subcategories.length) {
            console.log('[subCategoryService] Applied frontend filter for categoryId. Original count:', subcategories.length, 'Filtered count:', filteredSubcategories.length);
            subcategories = filteredSubcategories;
        }
    }

    // console.log('[subCategoryService] Parsed subcategories (after potential frontend filter):', subcategories);
    return subcategories;
  } catch (error) {
    console.error('[subCategoryService] Error fetching subcategories by categoryId:', error);
    return []; // Return empty array on error
  }
};

export default {
  getSubCategories,
  getSubCategoryById,
  createSubCategory,
  updateSubCategory,
  deleteSubCategory,
  getSubCategoriesByCategoryId,
};