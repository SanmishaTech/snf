import { post } from "./apiService";

export interface SNFOrderItemInput {
  name: string;
  variantName?: string | null;
  imageUrl?: string | null;
  price: number;
  quantity: number;
  productId?: number | null;
  depotProductVariantId?: number | null;
}

export interface SNFOrderCustomer {
  name: string;
  email?: string | null;
  mobile: string;
  addressLine1: string;
  addressLine2?: string | null;
  city: string;
  state?: string | null;
  pincode: string;
}

export interface CreateSNFOrderPayload {
  customer: SNFOrderCustomer;
  items: SNFOrderItemInput[];
  subtotal: number;
  deliveryFee?: number;
  totalAmount: number;
  walletamt?: number; // Amount to deduct from wallet (handled by backend)
  paymentMode?: string | null;
  paymentRefNo?: string | null;
  paymentStatus?: string; // 'PENDING' | 'PAID' | 'FAILED' etc.
  paymentDate?: string | null; // ISO string
  depotId?: number | null; // Optional depot association
}

export interface CreateSNFOrderResponse {
  success: boolean;
  message: string;
  data: {
    id: number;
    orderNo: string;
    totalAmount: number;
    paymentStatus: string;
    createdAt: string;
  };
}

export const snfOrderService = {
  createOrder: (payload: CreateSNFOrderPayload) =>
    post<CreateSNFOrderResponse>("/snf-orders", payload),
};
