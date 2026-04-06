/**
 * Frontend service for calling PhonePe payment API endpoints.
 * Uses the shared apiService helpers so the authToken is injected automatically.
 */
import { post, get } from './apiService';

interface InitiatePaymentOptions {
  snfOrderId?: number;
  productOrderId?: number;
  amount: number;
  redirectUrl: string;
}

interface InitiatePaymentResult {
  merchantOrderId: string;
  checkoutUrl: string;
}

export interface PaymentStatusResult {
  id: number;
  merchantOrderId: string;
  state: 'PENDING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  amount: number;
  transactionId?: string;
  utr?: string;
  paymentMode?: string;
  errorMessage?: string;
  snfOrderId?: number;
  productOrderId?: number;
}

/**
 * Initiate a PhonePe payment. Returns the checkout URL to redirect the user to.
 */
export async function initiatePhonePePayment(opts: InitiatePaymentOptions): Promise<InitiatePaymentResult> {
  const res = await post<{ success: boolean; data: InitiatePaymentResult; message?: string }>(
    '/api/phonepe/initiate',
    opts
  );
  if (!res.success) {
    throw new Error(res.message || 'Failed to initiate payment');
  }
  return res.data;
}

/**
 * Poll the payment status for a given merchantOrderId.
 */
export async function getPhonePePaymentStatus(merchantOrderId: string): Promise<PaymentStatusResult> {
  const res = await get<{ success: boolean; data: PaymentStatusResult; message?: string }>(
    `/api/phonepe/status/${merchantOrderId}`
  );
  if (!res.success) {
    throw new Error(res.message || 'Failed to get payment status');
  }
  return res.data;
}

