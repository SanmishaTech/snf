// frontend/src/components/ProductDetailWrapper.tsx
import React, { useEffect, useState } from 'react';
import MemberLayout from '@/layouts/MemberLayout';
import ProductDetailPage from '@/modules/Products/ProductDetailPage';

interface UserFromStorage {
  role: string;
  // Add other user properties if needed, though only role is used here
}

const ProductDetailWrapper: React.FC = () => {
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loadingRole, setLoadingRole] = useState(true);

  useEffect(() => {
    const storedUserData = localStorage.getItem('user');
    if (storedUserData) {
      try {
        const userData: UserFromStorage = JSON.parse(storedUserData);
        setUserRole(userData.role);
      } catch (error) {
        console.error("Error parsing user data from localStorage:", error);
        setUserRole(null);
      }
    } else {
      setUserRole(null);
    }
    setLoadingRole(false);
  }, []);

  if (loadingRole) {
    // Optional: return a loader while checking localStorage
    return <div>Loading...</div>; 
  }

  if (userRole === 'MEMBER') {
    return (
      <MemberLayout>
        <ProductDetailPage />
      </MemberLayout>
    );
  }

  // For non-members or unauthenticated users
  return <ProductDetailPage />;
};

export default ProductDetailWrapper;
