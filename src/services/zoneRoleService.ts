import { get, post, del, put } from './apiService'; // Use consistent API service

// No need for API_URL prefix as apiService handles this

export interface MemberSearchResult {
  id: number;
  memberName: string;
  organizationName?: string;
  profilePicture?: string;
  // Add other relevant member fields you might want to display
}

export interface ChapterOption {
  id: number;
  name: string;
}

export interface ZoneRoleAssignment {
  assignmentId: number;
  roleType: string;
  memberId: number;
  memberName: string;
  organizationName?: string;
  profilePicture?: string;
  assignedAt: string; // ISO date string
}

export interface ZoneDetailsWithRoles {
  success: boolean;
  zoneId: number;
  zoneName: string;
  roles: ZoneRoleAssignment[];
}

/**
 * Fetches all roles assigned within a specific zone.
 * @param zoneId - The ID of the zone.
 * @returns The list of zone role assignments.
 */
export const getZoneRoles = async (zoneId: number): Promise<ZoneDetailsWithRoles> => {
  const response = await get(`/zones/${zoneId}/roles`);
  return response as ZoneDetailsWithRoles;
};

/**
 * Gets chapters that belong to a specific zone
 * @param zoneId - The ID of the zone
 * @returns List of chapters in the zone
 */
export const getChaptersInZone = async (zoneId: number): Promise<ChapterOption[]> => {
  const response = await get(`/zones/${zoneId}/chapters`);
  return response.chapters || [];
};

/**
 * Assigns a role to a member within a zone.
 * @param zoneId - The ID of the zone.
 * @param memberId - The ID of the member.
 * @param roleType - The type of role to assign (e.g., "Regional Director").
 * @returns The newly created zone role assignment.
 */
export const assignZoneRole = async (zoneId: number, memberId: number, roleType: string): Promise<any> => {
  const response = await post(`/zones/${zoneId}/roles`, { memberId, roleType });
  return response;
};

/**
 * Removes a role assignment from a zone.
 * @param assignmentId - The ID of the zone role assignment.
 * @returns Confirmation message or data.
 */
export const removeZoneRole = async (assignmentId: number): Promise<any> => {
  return await del(`/zones/roles/${assignmentId}`);
};

/**
 * Fetches all chapters from the system.
 * @returns List of all chapters.
 */
export const fetchAllChapters = async (): Promise<ChapterOption[]> => {
  try {
    // Assuming the API returns a paginated response by default,
    // request a large limit to get all chapters.
    // Adjust limit as needed based on typical number of chapters.
    const response = await get('/chapters', { limit: '1000' }); 
    return (response && response.chapters) ? response.chapters : [];
  } catch (error) {
    console.error('Error fetching all chapters:', error);
    return [];
  }
};

/**
 * Searches for members based on a query string, filtered by chapter.
 * Uses the same endpoint as the chapter role member search.
 * @param searchQuery - The search term.
 * @param chapterId - Optional chapter ID to filter members.
 * @returns A list of members matching the search criteria.
 */
export const searchMembersForZoneAssignment = async (searchQuery: string, chapterId?: number): Promise<MemberSearchResult[]> => {
  // Using the same endpoint as used in chapterRoleService
  let params: Record<string, string> = { search: searchQuery };
  if (chapterId !== undefined) {
    params.chapterId = chapterId.toString();
  }
  
  try {
    const response = await get('/members/search', params);
    return (response && response.members) ? response.members : [];
  } catch (error) {
    console.error('Error searching for members:', error);
    return [];
  }
};

/**
 * Fetches the details of a specific zone.
 * @param zoneId - The ID of the zone to retrieve.
 * @returns The zone details.
 */
export const getZoneDetails = async (zoneId: number): Promise<{ id: number; name: string; active: boolean }> => {
  const response = await get(`/zones/${zoneId}`);
  return response;
};

/**
 * Updates the details of a specific zone.
 * @param zoneId - The ID of the zone to update.
 * @param data - The data to update the zone with.
 * @returns The updated zone details.
 */
export const updateZoneDetails = async (zoneId: number, data: { name: string }): Promise<any> => {
  const response = await put(`/zones/${zoneId}`, data);
  return response;
};

// You can add more functions as needed.
