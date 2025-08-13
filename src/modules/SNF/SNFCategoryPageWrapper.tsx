import React from 'react';
import { PricingProvider } from './context/PricingContext';
import { CartProvider } from './context/CartContext';
import CategoryProductsPage from './CategoryProductsPage';

const SNFCategoryPageWrapper: React.FC = () => {
  return (
    <PricingProvider>
      <CartProvider>
        <CategoryProductsPage />
      </CartProvider>
    </PricingProvider>
  );
};

export default SNFCategoryPageWrapper;