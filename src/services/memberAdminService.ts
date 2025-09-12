import { get } from './apiService';

export interface AdminMemberItem {
  id: number; // member.id
  userId: number; // user.id
  name: string;
  email?: string | null;
  role?: string;
  active?: boolean;
  walletBalance: number;
}

export interface AdminMembersResponse {
  members: AdminMemberItem[];
  page: number;
  totalPages: number;
  totalRecords: number;
}

export const getAdminMembers = async (params: {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
} = {}): Promise<AdminMembersResponse> => {
  return get<AdminMembersResponse>('/admin/members', params);
};
