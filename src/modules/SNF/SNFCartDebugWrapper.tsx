import React from 'react';
import { PricingProvider } from './context/PricingContext.tsx';
import { CartProvider } from './context/CartContext.tsx';
import CartDebugPage from './components/CartDebugPage.tsx';

const SNFCartDebugWrapper: React.FC = () => {
  return (
    <PricingProvider>
      <CartProvider>
        <CartDebugPage />
      </CartProvider>
    </PricingProvider>
  );
};

export default SNFCartDebugWrapper;