import React from 'react';
import { PricingProvider } from './context/PricingContext.tsx';
import { CartProvider } from './context/CartContext.tsx';
import CheckoutPage from './components/CheckoutPage.tsx';

const SNFCheckoutWrapper: React.FC = () => {
  return (
    <PricingProvider>
      <CartProvider>
        <CheckoutPage />
      </CartProvider>
    </PricingProvider>
  );
};

export default SNFCheckoutWrapper;
