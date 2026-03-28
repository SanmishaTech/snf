import React from 'react';
import { Navigate } from 'react-router-dom';

// --- Placeholder useAuth --- 
// IMPORTANT: Replace this with your actual authentication hook or logic.
// This placeholder assumes user information (including role) and authentication status
// are available. Adapt it to your project's authentication system.
const useAuth = () => {


  const token = localStorage.getItem('authToken');
  const userString = localStorage.getItem('user');



  if (token && userString) {
    try {
      const parsedUser = JSON.parse(userString);


      // Ensure parsedUser and its role are valid before considering authenticated
      if (parsedUser && typeof parsedUser.role === 'string') {
        const authState = {
          isAuthenticated: true,
          user: parsedUser, // Return the parsed user object directly
        };

        return authState;
      } else {

        const authState = { isAuthenticated: false, user: null };

        return authState;
      }
    } catch (e) {

      const authState = { isAuthenticated: false, user: null };

      return authState;
    }
  } else {

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
