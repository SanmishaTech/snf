import React from "react";

export type LoadingSkeletonType = 'product' | 'depot' | 'location' | 'price' | 'category';

interface LoadingSkeletonProps {
  count?: number;
  type?: LoadingSkeletonType;
  className?: string;
}

export const LoadingSkeleton: React.FC<LoadingSkeletonProps> = ({
  count = 8,
  type = 'product',
  className = ""
}) => {
  const baseClasses = "animate-pulse rounded-md bg-muted/40";
  
  const renderSkeleton = () => {
    switch (type) {
      case 'product':
        return (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4" aria-busy="true">
            {Array.from({ length: count }).map((_, i) => (
              <div key={i} className="rounded-lg border p-4 space-y-3">
                <div className={`${baseClasses} h-32`} />
                <div className={`${baseClasses} h-4 w-3/4`} />
                <div className={`${baseClasses} h-4 w-1/2`} />
                <div className={`${baseClasses} h-8`} />
              </div>
            ))}
          </div>
        );
        
      case 'depot':
        return (
          <div className={`space-y-4 ${className}`} aria-busy="true">
            <div className="flex items-center space-x-4">
              <div className={`${baseClasses} h-12 w-12 rounded-full`} />
              <div className="space-y-2 flex-1">
                <div className={`${baseClasses} h-4 w-1/3`} />
                <div className={`${baseClasses} h-3 w-1/2`} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className={`${baseClasses} h-16`} />
              <div className={`${baseClasses} h-16`} />
              <div className={`${baseClasses} h-16`} />
            </div>
          </div>
        );
        
      case 'location':
        return (
          <div className={`space-y-3 ${className}`} aria-busy="true">
            <div className={`${baseClasses} h-6 w-1/4`} />
            <div className="flex items-center space-x-3">
              <div className={`${baseClasses} h-10 w-10 rounded-full`} />
              <div className={`${baseClasses} h-10 flex-1 rounded-md`} />
            </div>
          </div>
        );
        
      case 'price':
        return (
          <div className={`flex items-center space-x-2 ${className}`} aria-busy="true">
            <div className={`${baseClasses} h-4 w-4 rounded-full animate-pulse`} />
            <div className={`${baseClasses} h-4 w-32`} />
          </div>
        );
        
      case 'category':
        return (
          <div className={`flex flex-wrap gap-2 ${className}`} aria-busy="true">
            {Array.from({ length: count }).map((_, i) => (
              <div key={i} className={`${baseClasses} h-8 w-20 rounded-full`} />
            ))}
          </div>
        );
        
      default:
        return (
          <div className={`space-y-3 ${className}`} aria-busy="true">
            {Array.from({ length: count }).map((_, i) => (
              <div key={i} className={`${baseClasses} h-4 w-full`} />
            ))}
          </div>
        );
    }
  };
  
  return renderSkeleton();
};

// Specific skeleton components for better reusability
export const ProductSkeleton: React.FC<{ count?: number }> = ({ count = 8 }) => (
  <LoadingSkeleton count={count} type="product" />
);

export const DepotSkeleton: React.FC = () => (
  <LoadingSkeleton type="depot" />
);

export const LocationSkeleton: React.FC = () => (
  <LoadingSkeleton type="location" />
);

export const PriceUpdateSkeleton: React.FC = () => (
  <LoadingSkeleton type="price" />
);

export const CategorySkeleton: React.FC<{ count?: number }> = ({ count = 6 }) => (
  <LoadingSkeleton count={count} type="category" />
);