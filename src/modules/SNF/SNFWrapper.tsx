import React from 'react';
import { PricingProvider } from './context/PricingContext';
import SNFLandingPage from './SNFLandingPage';

const SNFWrapper: React.FC = () => {
  return (
    <PricingProvider>
      <SNFLandingPage />
    </PricingProvider>
  );
};

export default SNFWrapper;