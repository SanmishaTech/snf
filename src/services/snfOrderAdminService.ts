import { get, patch, post } from './apiService';
import { backendUrl } from '../config';

export interface SNFOrderListItem {
  id: number;
  orderNo: string;
  name: string;
  mobile: string;
  email?: string;
  city: string;
  subtotal: number;
  deliveryFee: number;
  totalAmount: number;
  paymentMode?: string | null;
  paymentStatus: string;
  invoiceNo?: string | null;
  invoicePath?: string | null;
  createdAt: string;
  depot?: {
    id: number;
    name: string;
  } | null;
  _count: { items: number };
}

export interface PaginatedSNFOrdersResponse {
  orders: SNFOrderListItem[];
  currentPage: number;
  totalPages: number;
  totalRecords: number;
}

export interface SNFOrderItemDetail {
  id: number;
  depotProductVariantId?: number | null;
  productId?: number | null;
  name: string;
  variantName?: string | null;
  imageUrl?: string | null;
  price: number;
  quantity: number;
  lineTotal: number;
  createdAt: string;
}

export interface SNFOrderDetail {
  id: number;
  orderNo: string;
  memberId?: number | null;
  name: string;
  email?: string | null;
  mobile: string;
  addressLine1: string;
  addressLine2?: string | null;
  city: string;
  state?: string | null;
  pincode: string;
  subtotal: number;
  deliveryFee: number;
  totalAmount: number;
  paymentMode?: string | null;
  paymentStatus: string;
  paymentRefNo?: string | null;
  paymentDate?: string | null;
  invoiceNo?: string | null;
  invoicePath?: string | null;
  createdAt: string;
  updatedAt: string;
  items: SNFOrderItemDetail[];
  member?: {
    id: number;
    name: string;
  } | null;
  depot?: {
    id: number;
    name: string;
  } | null;
}

const API_BASE_URL = '/admin/snf-orders';

export const getAllSNFOrders = async (
  params: {
    page?: number;
    limit?: number;
    search?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    startDate?: string;
    endDate?: string;
  } = {}
): Promise<PaginatedSNFOrdersResponse> => {
  try {
    const response = await get<PaginatedSNFOrdersResponse>(API_BASE_URL, params);
    return response;
  } catch (error) {
    console.error('Failed to fetch SNF orders:', error);
    throw error;
  }
};

export const getSNFOrderById = async (id: number): Promise<SNFOrderDetail> => {
  try {
    const response = await get<SNFOrderDetail>(`${API_BASE_URL}/${id}`);
    return response;
  } catch (error) {
    console.error(`Failed to fetch SNF order ${id}:`, error);
    throw error;
  }
};

// Reusable payload for marking an order as paid
export interface MarkOrderPaidPayload {
  paymentMode?: string | null;
  paymentRefNo?: string | null;
  paymentDate?: string | null; // ISO date string (yyyy-MM-dd)
}

// Reusable function to mark any SNF order as PAID
export const markSNFOrderAsPaid = async (
  id: number,
  data: MarkOrderPaidPayload = {}
): Promise<SNFOrderDetail> => {
  try {
    // Backend endpoint is assumed to follow PATCH {id}/mark-paid convention
    const response = await patch<SNFOrderDetail>(`${API_BASE_URL}/${id}/mark-paid`, data);
    return response;
  } catch (error) {
    // If specific endpoint not found, gracefully fallback to updating the order directly
    const status = (error as any)?.status;
    if (status === 404) {
      try {
        const fallbackPayload: any = {
          paymentStatus: 'PAID',
          paymentMode: data.paymentMode ?? null,
          paymentRefNo: data.paymentRefNo ?? null,
          paymentDate: data.paymentDate ?? null,
        };
        const response = await patch<SNFOrderDetail>(`${API_BASE_URL}/${id}`, fallbackPayload);
        return response;
      } catch (fallbackError) {
        console.error(`Fallback update for SNF order ${id} failed:`, fallbackError);
        throw fallbackError;
      }
    }
    console.error(`Failed to mark SNF order ${id} as PAID:`, error);
    throw error;
  }
};

// Generate invoice for SNF order
export interface GenerateInvoiceResponse {
  success: boolean;
  message: string;
  data: {
    invoiceNo: string;
    invoicePath: string;
    order: SNFOrderDetail;
  };
}

export const generateSNFOrderInvoice = async (id: number): Promise<GenerateInvoiceResponse> => {
  try {
    const response = await post<GenerateInvoiceResponse>(`${API_BASE_URL}/${id}/generate-invoice`, {});
    return response;
  } catch (error) {
    console.error(`Failed to generate invoice for SNF order ${id}:`, error);
    throw error;
  }
};

// Download invoice for SNF order
export const downloadSNFOrderInvoice = async (id: number): Promise<void> => {
  try {
    const token = localStorage.getItem('authToken');
    if (!token) {
      throw new Error('Authentication required');
    }

    const response = await fetch(`${backendUrl}/api${API_BASE_URL}/${id}/download-invoice`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    // Get the filename from the response headers if available
    const contentDisposition = response.headers.get('content-disposition');
    let filename = `Invoice_${id}.pdf`;
    if (contentDisposition) {
      const filenameMatch = contentDisposition.match(/filename[^;=\n]*=(['"]?)([^'"\n]*?)\1/);
      if (filenameMatch) {
        filename = filenameMatch[2];
      }
    }

    // Convert response to blob and trigger download
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error downloading invoice:', error);
    throw error;
  }
};

// Check invoice status
export interface InvoiceStatusResponse {
  success: boolean;
  data: {
    orderId: number;
    orderNo: string;
    hasInvoice: boolean;
    invoiceNo?: string;
    invoiceAvailableForDownload: boolean;
    paymentStatus: string;
    totalAmount: number;
    orderDate: string;
  };
}

export const getSNFOrderInvoiceStatus = async (orderNo: string): Promise<InvoiceStatusResponse> => {
  try {
    const response = await get<InvoiceStatusResponse>(`/snf-orders/${orderNo}/invoice-status`);
    return response;
  } catch (error) {
    console.error(`Failed to get invoice status for order ${orderNo}:`, error);
    throw error;
  }
};

// Download invoice by orderNo (public endpoint)
export const downloadSNFOrderInvoiceByOrderNo = async (orderNo: string): Promise<void> => {
  try {
    const response = await fetch(`${backendUrl}/api/snf-orders/${orderNo}/download-invoice`, {
      method: 'GET',
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    // Get the filename from the response headers if available
    const contentDisposition = response.headers.get('content-disposition');
    let filename = `Invoice_${orderNo}.pdf`;
    if (contentDisposition) {
      const filenameMatch = contentDisposition.match(/filename[^;=\n]*=(['"]?)([^'"\n]*?)\1/);
      if (filenameMatch) {
        filename = filenameMatch[2];
      }
    }

    // Convert response to blob and trigger download
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error downloading invoice:', error);
    throw error;
  }
};
