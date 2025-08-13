// Test component to verify product detail functionality
import React from 'react';
import { useProduct } from './modules/SNF/hooks/useProducts';

const TestProductDetail: React.FC = () => {
  const { product, error, isLoading } = useProduct(1, 1); // Test product ID 1 with depot ID 1

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return (
      <div>
        <h2>Error:</h2>
        <pre>{JSON.stringify(error, null, 2)}</pre>
      </div>
    );
  }

  if (!product) {
    return <div>No product found</div>;
  }

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1>Product Detail Test</h1>
      
      <h2>Product Information:</h2>
      <ul>
        <li><strong>ID:</strong> {product.product.id}</li>
        <li><strong>Name:</strong> {product.product.name}</li>
        <li><strong>Description:</strong> {product.product.description || 'N/A'}</li>
        <li><strong>Is Dairy:</strong> {product.product.isDairyProduct ? 'Yes' : 'No'}</li>
        <li><strong>Category:</strong> {product.product.category?.name || 'N/A'}</li>
        <li><strong>Tags:</strong> {product.product.tags || 'N/A'}</li>
      </ul>

      <h2>Pricing Information:</h2>
      <ul>
        <li><strong>Buy Once Price:</strong> ₹{product.buyOncePrice}</li>
        <li><strong>MRP:</strong> ₹{product.mrp}</li>
        <li><strong>Discount:</strong> {product.discount ? `${Math.round(product.discount * 100)}%` : 'None'}</li>
        <li><strong>In Stock:</strong> {product.inStock ? 'Yes' : 'No'}</li>
        <li><strong>Delivery Time:</strong> {product.deliveryTime || 'N/A'}</li>
      </ul>

      <h2>Variants ({product.variants.length}):</h2>
      {product.variants.length > 0 ? (
        <ul>
          {product.variants.map((variant, index) => (
            <li key={variant.id || index}>
              <strong>{variant.name}</strong> - 
              MRP: ₹{variant.mrp}, 
              Buy Once: ₹{variant.buyOncePrice || 'N/A'}, 
              Stock: {variant.closingQty}, 
              Available: {!variant.notInStock && !variant.isHidden ? 'Yes' : 'No'}
            </li>
          ))}
        </ul>
      ) : (
        <p>No variants available</p>
      )}

      <h2>Raw Data:</h2>
      <details>
        <summary>Click to view raw product data</summary>
        <pre style={{ background: '#f5f5f5', padding: '10px', overflow: 'auto' }}>
          {JSON.stringify(product, null, 2)}
        </pre>
      </details>
    </div>
  );
};

export default TestProductDetail;