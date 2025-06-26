import { get, post, put, patch } from './apiService';

const API_URL = '/subscriptions';
const PRODUCT_ORDER_API_URL = '/product-orders';

// Types
export interface SubscriptionRequest {
  productId: string;
  deliveryAddressId: string;
  period: 'DAYS_7' | 'DAYS_15' | 'DAYS_30' | 'DAYS_90';
  deliverySchedule: 'DAILY' | 'WEEKDAYS' | 'ALTERNATE_DAYS';
  weekdays?: string[];
  qty: number;
  altQty?: number;
  paymentMode: 'ONLINE' | 'CASH' | 'UPI' | 'BANK';
  paymentReferenceNo?: string;
}

export interface SubscriptionDetail {
  productId: number;
  period: number;
  startDate: string;
  expiryDate?: string;
  deliverySchedule: string;
  weekdays?: string[];
  qty: number;
  altQty?: number;
  internalScheduleLogicType?: string;
}

export interface OrderWithSubscriptionsRequest {
  subscriptions: SubscriptionDetail[];
  deliveryAddressId: string;
  walletamt?: number;
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

export const createSubscription = async (subscriptionData: SubscriptionRequest): Promise<Subscription> => {
  return post<Subscription>(API_URL, subscriptionData);
};

export const createOrderWithSubscriptions = async (orderData: OrderWithSubscriptionsRequest): Promise<any> => {
  return post<any>(`${PRODUCT_ORDER_API_URL}/with-subscriptions`, orderData);
};

export const getSubscriptions = async (): Promise<Subscription[]> => {
  return get<Subscription[]>(API_URL);
};

export const getSubscriptionById = async (id: string): Promise<Subscription> => {
  return get<Subscription>(`${API_URL}/${id}`);
};

export const updateSubscription = async (id: string, data: Partial<SubscriptionRequest>): Promise<Subscription> => {
  return put<Subscription>(`${API_URL}/${id}`, data);
};

export const cancelSubscription = async (id: string): Promise<Subscription> => {
  return patch<Subscription>(`${API_URL}/${id}/cancel`, {});
};

export const renewSubscription = async (id: string): Promise<Subscription> => {
  return post<Subscription>(`${API_URL}/${id}/renew`, {});
};
