import { get, post, del } from './apiService';

export interface ChapterRole {
  id: number;
  roleType: string;
  memberId: number;
  chapterId: number;
  assignedAt: string;
  updatedAt: string;
  member: {
    id: number;
    memberName: string;
    email: string;
    mobile1: string;
    organizationName?: string;
    profilePicture?: string;
  };
}

export interface ChapterRoleHistory {
  id: number;
  roleId: number;
  memberId: number;
  action: string;
  performedById?: number;
  performedByName?: string;
  chapterId: number;
  roleType: string;
  startDate: string;
  endDate?: string;
  member: {
    id: number;
    memberName: string;
    email: string;
    mobile1: string;
  };
}

export interface Member {
  id: number;
  memberName: string;
  email: string;
  mobile1: string;
  organizationName?: string;
  profilePicture?: string;
}

// Get all roles for a specific chapter
export const getChapterRoles = async (chapterId: number): Promise<ChapterRole[]> => {
  const response = await get(`/chapters/${chapterId}/roles`);
  return response as ChapterRole[];
};

// Get history of role assignments for a chapter
export const getChapterRoleHistory = async (chapterId: number): Promise<ChapterRoleHistory[]> => {
  const response = await get(`/chapters/${chapterId}/roles/history`);
  return response as ChapterRoleHistory[];
};

// Assign a role to a member in a chapter
export const assignChapterRole = async (
  chapterId: number, 
  memberId: number,
  roleType: string,
  fromChapterId?: number
): Promise<ChapterRole> => {
  const payload = { memberId, roleType };
  
  // If fromChapterId is provided, add it to the payload (for cross-chapter assignments)
  if (fromChapterId) {
    Object.assign(payload, { fromChapterId });
  }
  
  const response = await post(`/chapters/${chapterId}/roles`, payload);
  return response as ChapterRole;
};

// Remove a role assignment
export const removeChapterRole = async (chapterId: number, roleId: number): Promise<void> => {
  await del(`/chapters/${chapterId}/roles/${roleId}`);
};

// Get all roles assigned to a specific member
export const getMemberRoles = async (memberId: number): Promise<ChapterRole[]> => {
  const response = await get(`/members/${memberId}/roles`);
  return response as ChapterRole[];
};

// Get all members (for dropdown selection)
export const getMembers = async (search: string = '', chapterId?: number): Promise<Member[]> => {
  let url = `/members/search?search=${encodeURIComponent(search)}`;
  if (chapterId !== undefined) {
    url += `&chapterId=${chapterId}`;
  }
  const response = await get(url);
  return response.members as Member[];
};

// Role types mapping
export const ROLE_TYPES = {
  chapterHead: 'Chapter Head',
  secretary: 'Secretary',
  treasurer: 'Treasurer',
  guardian: 'Guardian',
  developmentCoordinator: 'Development Co-ordinator',
 };

// Role type colors for visual distinction
export const ROLE_COLORS = {
  chapterHead: 'bg-blue-100 text-blue-800',
  secretary: 'bg-green-100 text-green-800',
  treasurer: 'bg-amber-100 text-amber-800',
  guardian: 'bg-purple-100 text-purple-800',
  developmentCoordinator: 'bg-rose-100 text-rose-800',
 };

export type RoleType = keyof typeof ROLE_TYPES;
