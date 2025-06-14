import React from 'react';
import { Navigate } from 'react-router-dom';

// --- Placeholder useAuth --- 
// IMPORTANT: Replace this with your actual authentication hook or logic.
// This placeholder assumes user information (including role) and authentication status
// are available. Adapt it to your project's authentication system.
const useAuth = () => {
  console.log("[AuthDebug] useAuth called");

  const token = localStorage.getItem('authToken');
  const userString = localStorage.getItem('user');

  console.log("[AuthDebug] Token from localStorage:", token);
  console.log("[AuthDebug] User string from localStorage:", userString);

  if (token && userString) {
    try {
      const parsedUser = JSON.parse(userString);
      console.log("[AuthDebug] Parsed user object:", parsedUser);
      console.log("[AuthDebug] Parsed user role:", parsedUser?.role);

      // Ensure parsedUser and its role are valid before considering authenticated
      if (parsedUser && typeof parsedUser.role === 'string') {
        const authState = {
          isAuthenticated: true,
          user: parsedUser, // Return the parsed user object directly
        };
        console.log("[AuthDebug] useAuth returning (authenticated):", authState);
        return authState;
      } else {
        console.error("[AuthDebug] AuthCheck: Parsed user is invalid or role is missing/not a string.", parsedUser);
        const authState = { isAuthenticated: false, user: null };
        console.log("[AuthDebug] useAuth returning (unauthenticated - bad user data):", authState);
        return authState;
      }
    } catch (e) {
      console.error("[AuthDebug] AuthCheck: Failed to parse user from localStorage. Error:", e);
      console.log("[AuthDebug] Raw userString that failed parsing:", userString);
      const authState = { isAuthenticated: false, user: null };
      console.log("[AuthDebug] useAuth returning (unauthenticated - parse error):", authState);
      return authState;
    }
  } else {
    console.log("[AuthDebug] useAuth returning (unauthenticated - token or userString missing)");
    return { isAuthenticated: false, user: null };
  }
};
// --- End of Placeholder useAuth ---

interface AdminProtectedRouteProps {
  children: React.ReactNode;
}

const AdminProtectedRoute: React.FC<AdminProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, user } = useAuth();

  // Redirect if not authenticated or if the user role is 'MEMBER'
  if (!isAuthenticated || user?.role === 'MEMBER') {
    // Redirect to the homepage as per requirements.
    // The 'replace' prop avoids adding the admin path to history when redirecting.
    return <Navigate to="/" replace />; 
  }

  // If authenticated and the role is not 'MEMBER' (e.g., 'ADMIN', 'VENDOR', 'AGENCY'),
  // render the children components (the protected admin pages).
  return <>{children}</>;
};

export default AdminProtectedRoute;
