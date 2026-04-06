import React from 'react';
import { PricingProvider } from './context/PricingContext.tsx';
import { CartProvider } from './context/CartContext.tsx';
import PaymentCallbackPage from './components/PaymentCallbackPage.tsx';

const SNFPaymentCallbackWrapper: React.FC = () => {
  return (
    <PricingProvider>
      <CartProvider>
        <PaymentCallbackPage />
      </CartProvider>
    </PricingProvider>
  );
};

export default SNFPaymentCallbackWrapper;

