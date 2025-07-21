/**
 * API service for PowerTeam and Category related operations.
 */
import axios from "axios"; // Or your preferred HTTP client
import {
  PowerTeam,
  PowerTeamInput,
  PaginatedPowerTeamResponse,
  Category,
  PaginatedCategoryResponse,
  SubCategory,
} from "../types/powerTeam.types";

// --- Configuration ---
// TODO: Replace with your actual API base URL and token retrieval logic
const API_BASE_URL = "http://localhost:3000//api"; // Adjust as per your setup

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem("authToken"); // Example: get token from local storage
  if (token) {
    config.headers = config.headers || {}; // Ensure headers object exists
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor to catch insufficient privilege errors (403) and redirect to '/'
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const status: number | undefined = error.response?.status;
    const message: string | undefined =
      error.response?.data?.error?.message || error.response?.data?.message;
    if (
      status === 403 &&
      message?.toLowerCase().includes("insufficient privileges")
    ) {
      const role = error.response?.data?.error?.role?.toLowerCase();
      // Optionally clear token
      // localStorage.removeItem("authToken");
      window.location.href = role === "MEMBER" ? "/" : "/admin/dashboard";
    }
    return Promise.reject(error);
  }
);

// --- Category API --- (Needed for the PowerTeam form)

/**
 * Fetches a paginated list of categories.
 * @param params - Query parameters for pagination, search, sort.
 */
export const getCategories = async (params?: {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}): Promise<PaginatedCategoryResponse> => {
  try {
    const response = await apiClient.get<PaginatedCategoryResponse>(
      "/categories",
      { params }
    );
    return response.data;
  } catch (error) {
    console.error("Failed to fetch categories:", error);
    throw error;
  }
};

/**
 * Fetches all categories (useful for populating a dropdown/multi-select).
 * This might fetch all pages if your backend supports a high limit or no pagination for this use case.
 */
export const getAllCategories = async (): Promise<Category[]> => {
  try {
    // Adjust limit if your API supports fetching all with a large limit
    // Or implement recursive fetching if necessary and not too many categories
    let allCategories: Category[] = [];
    let currentPage = 1;
    let totalPages = 1;
    const limit = 100; // Fetch 100 at a time

    do {
      const response = await getCategories({ page: currentPage, limit });
      allCategories = allCategories.concat(response.categories);
      totalPages = response.totalPages;
      currentPage++;
    } while (currentPage <= totalPages);

    return allCategories;
  } catch (error) {
    console.error("Failed to fetch all categories:", error);
    throw error;
  }
};

// Function to get all subcategories for a specific category ID
export const getSubCategoriesByCategoryId = async (
  categoryId: number
): Promise<SubCategory[]> => {
  const response = await apiClient.get<SubCategory[]>(
    `/subcategories/category/${categoryId}`
  );
  return response.data;
};

// --- PowerTeam API ---

/**
 * Fetches a paginated list of power teams.
 * @param params - Query parameters for pagination, search, sort.
 */
export const getPowerTeams = async (params?: {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}): Promise<PaginatedPowerTeamResponse> => {
  try {
    const response = await apiClient.get<PaginatedPowerTeamResponse>(
      "/powerteams",
      { params }
    );
    return response.data;
  } catch (error) {
    console.error("Failed to fetch power teams:", error);
    throw error;
  }
};

/**
 * Fetches a single power team by its ID.
 * @param id - The ID of the power team.
 */
export const getPowerTeamById = async (id: number): Promise<PowerTeam> => {
  try {
    const response = await apiClient.get<PowerTeam>(`/powerteams/${id}`);
    return response.data;
  } catch (error) {
    console.error(`Failed to fetch power team with ID ${id}:`, error);
    throw error;
  }
};

/**
 * Creates a new power team.
 * @param powerTeamData - The data for the new power team.
 */
export const createPowerTeam = async (
  powerTeamData: PowerTeamInput
): Promise<PowerTeam> => {
  try {
    const response = await apiClient.post<PowerTeam>(
      "/powerteams",
      powerTeamData
    );
    return response.data;
  } catch (error) {
    console.error("Failed to create power team:", error);
    // Consider more specific error handling, e.g., for validation errors
    throw error;
  }
};

/**
 * Updates an existing power team.
 * @param id - The ID of the power team to update.
 * @param powerTeamData - The updated data for the power team.
 */
export const updatePowerTeam = async (
  id: number,
  powerTeamData: Partial<PowerTeamInput>
): Promise<PowerTeam> => {
  try {
    const response = await apiClient.put<PowerTeam>(
      `/powerteams/${id}`,
      powerTeamData
    );
    return response.data;
  } catch (error) {
    console.error(`Failed to update power team with ID ${id}:`, error);
    throw error;
  }
};

/**
 * Deletes a power team by its ID.
 * @param id - The ID of the power team to delete.
 */
export const deletePowerTeam = async (
  id: number
): Promise<{ message: string }> => {
  try {
    const response = await apiClient.delete<{ message: string }>(
      `/powerteams/${id}`
    );
    return response.data;
  } catch (error) {
    console.error(`Failed to delete power team with ID ${id}:`, error);
    throw error;
  }
};
