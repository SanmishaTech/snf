import { get } from './apiService';

export interface AdminDeliveryAddress {
  id: number;
  memberId: number;
  recipientName: string;
  mobile: string;
  plotBuilding: string;
  streetArea: string;
  landmark?: string | null;
  pincode: string;
  city: string;
  state?: string | null;
  label?: string | null;
  isDefault?: boolean;
}

export const getAdminDeliveryAddresses = async (memberId: number): Promise<AdminDeliveryAddress[]> => {
  return get<AdminDeliveryAddress[]>('/admin/delivery-addresses', { memberId });
};
