import {get,post,put,del} from './apiService';

export interface PurchasePaymentDetailInput {
  purchaseId: number;
  amount: number;
}

export interface PurchasePaymentInput {
  paymentDate: string; // yyyy-mm-dd
  vendorId: number;
  mode: string;
  referenceNo?: string;
  notes?: string;
  totalAmount: number;
  details: PurchasePaymentDetailInput[];
}

export const createPurchasePayment = (data: PurchasePaymentInput) =>
  post('/api/admin/purchase-payments', data).then((res) => res.data);

export const fetchPurchasePayments = (params: Record<string, any>) =>
  get('/api/admin/purchase-payments', { params }).then((res) => res);

export const fetchPurchasePaymentById = (id: number) =>
  get(`/api/admin/purchase-payments/${id}`).then((res) => res);

export const updatePurchasePayment = (id: number, data: PurchasePaymentInput) =>
  put(`/api/admin/purchase-payments/${id}`, data).then((res) => res.data);

export const deletePurchasePayment = (id: number) =>
  del(`/api/admin/purchase-payments/${id}`).then((res) => res.data);

export const fetchVendorPurchases = (vendorId: number, params: Record<string, any> = {}) =>
  get(`/api/admin/vendors/${vendorId}/purchases`, { params }).then((res) => res);
