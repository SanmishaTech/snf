import { get, post, put, patch } from './apiService';

// Base path for subscription endpoints (apiService will prefix with /api)
const API_URL = '/subscriptions';

// Types
export interface SubscriptionRequest {
  productId: string;
  deliveryAddressId: string;
  period: 'DAYS_7' | 'DAYS_15' | 'DAYS_30' | 'DAYS_90';
  deliverySchedule: 'DAILY' | 'WEEKDAYS' | 'ALTERNATE_DAYS';
  weekdays?: string[]; // Required if schedule is WEEKDAYS
  qty: number;
  altQty?: number; // Optional for ALTERNATE_DAYS
  paymentMode: 'ONLINE' | 'CASH' | 'UPI' | 'BANK';
  paymentReferenceNo?: string;
}

export interface Subscription {
  id: number;
  memberId: number;
  deliveryAddressId: number;
  productId: number;
  period: string;
  expiryDate: string;
  deliverySchedule: string;
  weekdays: string | null;
  qty: number;
  altQty: number | null;
  rate: number;
  totalQty: number;
  amount: number;
  paymentMode: string;
  paymentReferenceNo: string | null;
  paymentDate: string | null;
  paymentStatus: string;
  agencyId: number | null;
  createdAt: string;
  updatedAt: string;
}

// Create new subscription
export const createSubscription = async (subscriptionData: SubscriptionRequest): Promise<Subscription> => {
  return post<Subscription>(API_URL, subscriptionData);
};

// Get all subscriptions for current user
export const getSubscriptions = async (): Promise<Subscription[]> => {
  return get<Subscription[]>(API_URL);
};

// Get subscription by ID
export const getSubscriptionById = async (id: string): Promise<Subscription> => {
  return get<Subscription>(`${API_URL}/${id}`);
};

// Update subscription
export const updateSubscription = async (id: string, data: Partial<SubscriptionRequest>): Promise<Subscription> => {
  return put<Subscription>(`${API_URL}/${id}`, data);
};

// Cancel subscription
export const cancelSubscription = async (id: string): Promise<Subscription> => {
  return patch<Subscription>(`${API_URL}/${id}/cancel`, {});
};

// Renew subscription
export const renewSubscription = async (id: string): Promise<Subscription> => {
  return post<Subscription>(`${API_URL}/${id}/renew`, {});
};
