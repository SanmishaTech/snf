import { get, post, put, del } from './apiService';

export enum DiscountType {
  PERCENTAGE = 'PERCENTAGE',
  CASH = 'CASH',
}

export interface Coupon {
  id: number;
  code: string;
  discountType: DiscountType;
  discountValue: number;
  minOrderAmount?: number;
  maxDiscountAmount?: number;
  fromDate?: string;
  toDate?: string;
  expiryDate?: string;
  isActive: boolean;

  usageLimit?: number;
  usageCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CouponFormData {
  code: string;
  discountType: DiscountType;
  discountValue: number;
  minOrderAmount?: number;
  fromDate?: string;

  toDate?: string;
  expiryDate?: string;
  isActive: boolean;

  usageLimit?: number;
}

export interface PaginatedCouponsResponse {
  coupons: Coupon[];
  currentPage: number;
  totalPages: number;
  totalRecords: number;
}

const API_BASE_URL = '/api/admin/coupons';

export const getAllCoupons = async (
  params: {
    page?: number;
    limit?: number;
    search?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  } = {}
): Promise<PaginatedCouponsResponse> => {
  try {
    const response = await get<PaginatedCouponsResponse>(API_BASE_URL, params);
    return response;
  } catch (error) {
    console.error('Failed to fetch coupons:', error);
    throw error;
  }
};

export const getCouponById = async (id: number): Promise<Coupon> => {
  return get<Coupon>(`${API_BASE_URL}/${id}`);
};

export const createCoupon = async (data: CouponFormData): Promise<Coupon> => {
  return post<Coupon>(API_BASE_URL, data);
};

export const updateCoupon = async (id: number, data: Partial<CouponFormData>): Promise<Coupon> => {
  return put<Coupon>(`${API_BASE_URL}/${id}`, data);
};

export const deleteCoupon = async (id: number): Promise<void> => {
  return del(`${API_BASE_URL}/${id}`);
};

/**
 * Validate a coupon code for a specific order amount
 */
export const validateCoupon = async (code: string, amount: number): Promise<{
  success: boolean;
  message: string;
  coupon?: Coupon;
  discountAmount?: number;
}> => {
  try {
    // Note: Using the new validation endpoint in SNF Order Routes
    const response = await post<{
      success: boolean;
      message: string;
      coupon?: Coupon;
      discountAmount?: number;
    }>('/api/snf-orders/validate-coupon', { code, amount });
    return response;
  } catch (error: any) {

    return {
      success: false,
      message: error?.message || 'Failed to validate coupon',
    };
  }
};

/**
 * Helper to generate a unique coupon code
 */
export const generateCouponCode = (prefix: string = 'SNF-'): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = prefix;
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};
