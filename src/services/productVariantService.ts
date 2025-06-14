import { post, put, del } from './apiService';

// Define the DTO for a product variant based on the Prisma schema
export interface ProductVariantDto {
  id?: number;
  hsnCode?: string | null;
  mrp: number;
  sellingPrice: number;
  purchasePrice: number;
  gstRate: number;
  name: string;
}

/**
 * Handles the logic for creating, updating, and deleting product variants.
 * This could be a single bulk update endpoint for simplicity.
 * @param productId The ID of the parent product.
 * @param variants The array of variants to be saved.
 */
export const bulkUpdateVariants = (productId: string, variants: ProductVariantDto[]) => {
  // This function would make a POST or PUT request to a new endpoint
  // e.g., POST /products/:productId/variants/bulk
  // The backend would then diff the incoming array with the existing variants
  // and perform the necessary create, update, and delete operations.
  return post(`/products/${productId}/variants/bulk`, { variants });
};

// Example of individual services if you prefer that approach

export const createVariant = (productId: string, data: ProductVariantDto) => {
  return post(`/products/${productId}/variants`, data);
};

export const updateVariant = (variantId: number, data: Partial<ProductVariantDto>) => {
  return put(`/variants/${variantId}`, data);
};

export const deleteVariant = (variantId: number) => {
  return del(`/variants/${variantId}`);
};
