import React from 'react';
import { Header } from './Header';
import { Footer } from './Footer';
import { CartValidationDebug } from './CartValidationDebug';
import { useCart } from '../context/CartContext';

const CartDebugPage: React.FC = () => {
  const { totalQuantity } = useCart();

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header cartCount={totalQuantity} onSearch={() => {}} />
      
      <main className="flex-1 container mx-auto px-4 md:px-6 lg:px-8 py-6">
        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-semibold mb-2">Cart Validation Debug</h1>
          <p className="text-muted-foreground">
            Test cart validation across different depot locations
          </p>
        </div>
        
        <CartValidationDebug />
      </main>
      
      <Footer />
    </div>
  );
};

export default CartDebugPage;