import axios from "axios";
import { backendUrl } from "../config";

const api = axios.create({
  baseURL: backendUrl,
});

// Global response interceptor to handle authorization/privilege errors in a single place
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status: number | undefined = error.response?.status;
    const message: string | undefined =
      error.response?.data?.error?.message || error.response?.data?.message;

    // If the backend indicates the user has insufficient privileges, force logout/redirect
    if (status === 403 && message?.toLowerCase().includes("insufficient privileges")) {
      const role = error.response?.data?.error?.role?.toLowerCase();
      // Optionally clear any auth-related storage here if needed
      // localStorage.removeItem("authToken");
            window.location.href = role === 'member' ? '/' : '/admin/dashboard';
    }

    // Propagate the error so that individual callers can still handle it if needed
    return Promise.reject(error);
  }
);

// Helper function to ensure URLs are prefixed with '/api'
const ensureApiPrefix = (url: string): string => {
  // If URL already starts with '/api', return as is
  if (url.startsWith('/api')) {
    return url;
  }
  // Otherwise, add the '/api' prefix
  return `/api${url.startsWith('/') ? '' : '/'}${url}`;
};

// Helper function to extract the most meaningful error message
const extractErrorMessage = (error: any): string => {
  // Check different common locations for error messages
  const message = (
    error.response?.data?.message ||
    error.response?.data?.error?.message ||
    error.response?.data?.errors?.message ||
    error.response?.data?.errors?.[0]?.message ||
    error.message ||
    'Request failed'
  );
  
  // Add HTTP status context to the error message for more clarity
  if (error.response?.status) {
    const statusMap: Record<number, string> = {
      400: 'Bad Request: ',
      401: 'Unauthorized: ',
      403: 'Forbidden: ',
      404: 'Not Found: ',
      409: 'Conflict: ',
      422: 'Validation Error: ',
      500: 'Server Error: '
    };
    
    const statusPrefix = statusMap[error.response.status] || `Error ${error.response.status}: `;
    return `${statusPrefix}${message}`;
  }
  
  return message;
};

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("authToken");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const get = async <T = any>(url: string, params?: any, config?: any): Promise<T> => {
  try {
    const finalConfig = {
      params,
      ...config,
    };

    const response = await api.get(ensureApiPrefix(url), finalConfig);

    if (config?.responseType === "blob") {
      return response as T;
    }

    return response.data as T;
  } catch (error: any) {
    console.error('GET request error details:', error.response?.data);
    throw {
      status: error.response?.status,
      errors: error.response?.data?.errors || [],
      message: extractErrorMessage(error),
      data: error.response?.data, // Include the full error data for more detailed debugging
      originalError: error // Keep the original error for reference
    };
  }
};

export const post = async <T = any>(url: string, data: any, config?: any): Promise<T> => {
  try {
    const response = await api.post(ensureApiPrefix(url), data, config);
    if (config?.responseType === "blob") {
      return response as T;
    }

    return response.data as T;
  } catch (error: any) {
    console.error('POST request error details:', error.response?.data);
    throw {
      status: error.response?.status,
      errors: error.response?.data?.errors || [],
      message: extractErrorMessage(error),
      data: error.response?.data, // Include the full error data for more detailed debugging
      originalError: error // Keep the original error for reference
    };
  }
};

export const put = async <T = any>(url: string, data: any): Promise<T> => {
  try {
    const response = await api.put(ensureApiPrefix(url), data);
    return response.data as T;
  } catch (error: any) {
    console.error('PUT request error details:', error.response?.data);
    throw {
      status: error.response?.status,
      errors: error.response?.data?.errors || [],
      message: extractErrorMessage(error),
      data: error.response?.data,
      originalError: error
    };
  }
};

export const patch = async <T = any>(url: string, data: any): Promise<T> => {
  try {
    const response = await api.patch(ensureApiPrefix(url), data);
    return response.data as T;
  } catch (error: any) {
    console.error('PATCH request error details:', error.response?.data);
    throw {
      status: error.response?.status,
      errors: error.response?.data?.errors || [],
      message: extractErrorMessage(error),
      data: error.response?.data,
      originalError: error
    };
  }
};

export const del = async <T = any>(url: string): Promise<T> => {
  try {
    const response = await api.delete(ensureApiPrefix(url));
    return response.data as T;
  } catch (error: any) {
    console.error('DELETE request error details:', error.response?.data);
    throw {
      status: error.response?.status,
      errors: error.response?.data?.errors || [],
      message: extractErrorMessage(error),
      data: error.response?.data,
      originalError: error
    };
  }
};

export const postupload = async (
  url: string,
  formData: FormData,
  config?: any
) => {
  try {
    // Create a new instance without Content-Type for file uploads
    const uploadInstance = axios.create({
      baseURL: backendUrl,
    });

    // Add authentication token
    uploadInstance.interceptors.request.use((config) => {
      const token = localStorage.getItem("authToken");
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    const response = await uploadInstance.post(ensureApiPrefix(url), formData, config);
    return response.data;
  } catch (error: any) {
    console.error('POST UPLOAD request error details:', error.response?.data);
    throw {
      status: error.response?.status,
      errors: error.response?.data?.errors || [],
      message: extractErrorMessage(error),
      data: error.response?.data,
      originalError: error
    };
  }
};

export const putupload = async (
  url: string,
  formData: FormData,
  config?: any
) => {
  try {
    // Create a new instance without Content-Type for file uploads
    const uploadInstance = axios.create({
      baseURL: backendUrl,
    });

    // Add authentication token
    uploadInstance.interceptors.request.use((config) => {
      const token = localStorage.getItem("authToken");
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    const response = await uploadInstance.put(ensureApiPrefix(url), formData, config);
    return response.data;
  } catch (error: any) {
    console.error('PUT UPLOAD request error details:', error.response?.data);
    throw {
      status: error.response?.status,
      errors: error.response?.data?.errors || [],
      message: extractErrorMessage(error),
      data: error.response?.data,
      originalError: error
    };
  }
};

// Types for Delivery Schedule Management
export enum DeliveryStatus {
  PENDING = 'PENDING',
  DELIVERED = 'DELIVERED',
  NOT_DELIVERED = 'NOT_DELIVERED',
  CANCELLED = 'CANCELLED',
}

export interface ApiUser {
  id: number;
  name: string;
  email?: string;
}

export interface ApiMember {
  id: number;
  name: string;
  user?: ApiUser; // User details might be nested
  phoneNumber?: string; // Added phoneNumber
}

export interface ApiProduct {
  id: number;
  name: string;
  unit?: string;
}

export interface ApiDeliveryAddress {
  id: number;
  recipientName: string;
  mobile: string;
  plotBuilding: string;
  streetArea: string;
  landmark?: string;
  pincode: string;
  city: string;
  state: string;
  label?: string;
  deliveryNotes?: string; // Added deliveryNotes
}

export interface ApiSubscriptionInfo {
    id: number;
    // Add other relevant subscription fields if needed by the frontend for context
}

export interface ApiDeliveryScheduleEntry {
  id: string; // Prisma CUID is a string
  subscriptionId: number;
  memberId: number;
  deliveryAddressId: number;
  productId: number;
  deliveryDate: string; // ISO date string
  quantity: number;
  status: DeliveryStatus;
  createdAt: string; // ISO date string
  updatedAt: string; // ISO date string
  product: ApiProduct;
  member: ApiMember;
  deliveryAddress: ApiDeliveryAddress;
  subscription: ApiSubscriptionInfo; 
}

