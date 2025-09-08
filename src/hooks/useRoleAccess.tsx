import { useAuth } from './useAuth';

interface RoleAccessMethods {
  isAdmin: boolean;
  checkIsAdmin: () => boolean;
  isAgency: boolean;
  checkIsAgency: () => boolean;
  isVendor: boolean;
  checkIsVendor: () => boolean;
}

export function useRoleAccess(): RoleAccessMethods {
  // Try to use the auth context if available
  let user = null;
  
  try {
    // Try to get user from auth context
    const auth = useAuth();
    user = auth.user;
  } catch (error) {
    // Fallback to localStorage if AuthProvider is not available
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        user = JSON.parse(userStr);
      } catch (e) {
        console.error("Failed to parse user data from localStorage", e);
      }
    }
  }
  
  // Check if the user has admin role
  const checkIsAdmin = (): boolean => {
    if (!user || !user.role) return false;
    const role = user.role.toString().toUpperCase();
    return role === 'ADMIN' || role === 'SUPER_ADMIN' || role.includes('ADMIN');
  };

  // Pre-computed property for common check
  const isAdmin = checkIsAdmin();

  // Check if the user has agency role
  const checkIsAgency = (): boolean => {
    if (!user || !user.role) return false;
    const role = user.role.toString().toUpperCase();
    return role === 'AGENCY' || role.includes('AGENCY');
  };
  const isAgency = checkIsAgency();

  // Check if the user has vendor role
  const checkIsVendor = (): boolean => {
    if (!user || !user.role) return false;
    const role = user.role.toString().toUpperCase();
    return role === 'VENDOR' || role.includes('VENDOR');
  };
  const isVendor = checkIsVendor();

  return {
    isAdmin,
    checkIsAdmin,
    isAgency,
    checkIsAgency,
    isVendor,
    checkIsVendor
  };
} 