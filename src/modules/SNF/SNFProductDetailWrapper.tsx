import React from 'react';
import { PricingProvider } from './context/PricingContext';
import { CartProvider } from './context/CartContext';
import ProductDetailPage from './components/ProductDetailPage';

const SNFProductDetailWrapper: React.FC = () => {
  return (
    <PricingProvider>
      <CartProvider>
        <ProductDetailPage />
      </CartProvider>
    </PricingProvider>
  );
};

export default SNFProductDetailWrapper;
