import React from 'react';
import { PricingProvider } from './context/PricingContext.tsx';
import { CartProvider } from './context/CartContext.tsx';
import SNFAddressPage from './SNFAddressPage.tsx';

const SNFAddressWrapper: React.FC = () => {
  return (
    <PricingProvider>
      <CartProvider>
        <SNFAddressPage />
      </CartProvider>
    </PricingProvider>
  );
};

export default SNFAddressWrapper;
