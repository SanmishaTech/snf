import { get, post } from "@/services/apiService";

export interface Member {
  id: number;
  userId: number;
  name: string;
  email: string | null;
  mobile: string;
  walletBalance: number;
}

export interface ProductVariant {
  id: number;
  name: string;
  price: number;
  stock: number;
}

export interface Product {
  id: number;
  name: string;
  category: string;
  imageUrl: string | null;
  variants: ProductVariant[];
}

export interface CartItem {
  id: string; // unique id for cart
  productId: number;
  productName: string;
  variantId: number;
  variantName: string;
  price: number;
  quantity: number;
  imageUrl: string | null;
}

export interface CreatePosOrderPayload {
  memberId: number;
  customer: {
    name: string;
    email?: string | null;
    mobile: string;
  };
  items: {
    name: string;
    variantName: string;
    price: number;
    quantity: number;
    depotProductVariantId: number;
  }[];
  subtotal: number;
  totalAmount: number;
  walletamt: number;
  paymentMode: "CASH" | "WALLET" | "ONLINE" | "UPI";
  paymentRefNo?: string | null;
  depotId: number;
}

export interface PosOrderResponse {
  success: boolean;
  message: string;
  data: {
    id: number;
    orderNo: string;
    totalAmount: number;
    paymentMode: string;
    paymentStatus: string;
    items: any[];
    createdAt: string;
  };
}

export const posService = {
  // Search members by name or mobile
  searchMembers: (query: string) =>
    get<{ success: boolean; data: Member[] }>(`/pos/members/search?q=${encodeURIComponent(query)}`),

  // Quick register walk-in customer
  quickRegisterMember: (data: { name: string; mobile: string; email?: string }) =>
    post<{ success: boolean; message: string; data: Member }>("/pos/members", data),

  // Get member wallet balance
  getMemberWallet: (memberId: number) =>
    get<{ success: boolean; data: { balance: number } }>(`/pos/members/${memberId}/wallet`),

  // Get depot products for POS
  getDepotProducts: (depotId: number) =>
    get<{ success: boolean; data: Product[] }>(`/pos/products?depotId=${depotId}`),

  // Create POS order
  createOrder: (payload: CreatePosOrderPayload) =>
    post<PosOrderResponse>("/pos/orders", payload),
};
