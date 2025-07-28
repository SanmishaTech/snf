/**
 * Utility functions for authentication
 */

/**
 * Get the authentication token from localStorage
 * @returns The authentication token or null if not found
 */
export const getToken = (): string | null => {
  return localStorage.getItem('authToken');
};

/**
 * Get the current user data from localStorage
 * @returns The user data or null if not found
 */
export const getCurrentUser = (): any | null => {
  const userStr = localStorage.getItem('user');
  return userStr ? JSON.parse(userStr) : null;
};

/**
 * Check if the user is authenticated
 * @returns True if the user is authenticated, false otherwise
 */
export const isAuthenticated = (): boolean => {
  return Boolean(getToken());
};

/**
 * Check if user is authenticated before making API calls
 * Throws an error if not authenticated to prevent unnecessary API calls
 * @returns True if authenticated, throws error if not
 */
export const requireAuth = (): boolean => {
  if (!isAuthenticated()) {
    throw new Error('User not authenticated');
  }
  return true;
};

/**
 * Clear all authentication data from localStorage
 */
export const clearAuthData = (): void => {
  localStorage.removeItem("authToken");
  localStorage.removeItem("user");
  localStorage.removeItem("refreshToken");
  localStorage.removeItem("memberId");
  localStorage.removeItem("roles");
  localStorage.removeItem("agencyId");
};

/**
 * Redirect user to appropriate login page and clear auth data
 * @param currentPath - Current path to determine redirect destination
 */
export const redirectToLogin = (currentPath?: string): void => {
  clearAuthData();
  
  // Determine appropriate login page based on current path
  if (currentPath?.startsWith("/admin")) {
    window.location.href = "/admin";
  } else {
    window.location.href = "/login";
  }
};
