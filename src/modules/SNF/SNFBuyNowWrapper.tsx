import React from 'react';
import { PricingProvider } from './context/PricingContext.tsx';
import { CartProvider } from './context/CartContext.tsx';
import BuyNowCheckoutPage from './components/BuyNowCheckoutPage.tsx';

const SNFBuyNowWrapper: React.FC = () => {
  return (
    <PricingProvider>
      <CartProvider>
        <BuyNowCheckoutPage />
      </CartProvider>
    </PricingProvider>
  );
};

export default SNFBuyNowWrapper;