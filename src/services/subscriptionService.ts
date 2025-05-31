import axios from 'axios';

// Simple auth token getter (using localStorage directly since we don't have a dedicated utility yet)
const getToken = (): string | null => {
  return localStorage.getItem('authToken');
};

const API_URL = '/api/subscriptions';

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
  const token = getToken();
  const response = await axios.post(API_URL, subscriptionData, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
  return response.data;
};

// Get all subscriptions for current user
export const getSubscriptions = async (): Promise<Subscription[]> => {
  const token = getToken();
  const response = await axios.get(API_URL, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
  return response.data;
};

// Get subscription by ID
export const getSubscriptionById = async (id: string): Promise<Subscription> => {
  const token = getToken();
  const response = await axios.get(`${API_URL}/${id}`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
  return response.data;
};

// Update subscription
export const updateSubscription = async (id: string, data: Partial<SubscriptionRequest>): Promise<Subscription> => {
  const token = getToken();
  const response = await axios.put(`${API_URL}/${id}`, data, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
  return response.data;
};

// Cancel subscription
export const cancelSubscription = async (id: string): Promise<Subscription> => {
  const token = getToken();
  const response = await axios.patch(`${API_URL}/${id}/cancel`, {}, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
  return response.data;
};

// Renew subscription
export const renewSubscription = async (id: string): Promise<Subscription> => {
  const token = getToken();
  const response = await axios.post(`${API_URL}/${id}/renew`, {}, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
  return response.data;
};
