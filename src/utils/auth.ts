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
