import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { get } from '@/services/apiService';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, Search } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { formatCurrency } from '@/lib/formatter';

interface Product {
  id: number;
  name: string;
  price: number; // Assuming price is a number from backend
  rate: number;  // Assuming rate is a number
  unit: string | null;
  description: string | null;
  attachmentUrl: string | null;
}

interface ApiResponse {
  data: Product[];
  // Add other pagination fields if your public API supports them
  // totalPages: number;
  // totalRecords: number;
  // currentPage: number;
}

// Simplified fetch for public/member product listing
const fetchMemberProducts = async (): Promise<Product[]> => {
  // Adjust endpoint if you have a specific one for members or public view
  // For now, using the general /products endpoint and assuming it returns all needed data
  const response = await get('/products') as ApiResponse | Product[]; 
  if (Array.isArray(response)) {
    return response;
  } else if (response && response.data) {
    return response.data;
  }
  return []; // Fallback to empty array
};

const MemberProductDisplayPage: React.FC = () => {
  const navigate = useNavigate();
  const { data: products, isLoading, isError, error } = useQuery<Product[], Error>({
    queryKey: ['memberProducts'],
    queryFn: fetchMemberProducts,
  });

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
            <Card key={i}>
              <Skeleton className="h-48 w-full rounded-t-md" />
              <CardContent className="p-4">
                <Skeleton className="h-6 w-3/4 mb-2" />
                <Skeleton className="h-4 w-1/2 mb-1" />
                <Skeleton className="h-4 w-1/4" />
              </CardContent>
              <CardFooter className="p-4">
                <Skeleton className="h-10 w-full" />
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (isError || !products) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            Could not fetch products. {error?.message || 'An unknown error occurred.'}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <Search size={48} className="mx-auto mb-4 text-muted-foreground" />
        <h2 className="text-2xl font-semibold mb-2">No Products Available</h2>
        <p className="text-muted-foreground">Please check back later.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8 text-center">Our Products</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {products.map((product) => (
          <Card key={product.id} className="flex flex-col overflow-hidden hover:shadow-lg transition-shadow duration-200">
            <div className="h-48 w-full bg-gray-100 flex items-center justify-center overflow-hidden">
              {product.attachmentUrl ? (
                <img 
                  src={`${import.meta.env.VITE_BACKEND_URL}${product.attachmentUrl}`}
                  alt={product.name} 
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="text-gray-400">No Image</div>
              )}
            </div>
            <CardHeader className="p-4">
              <CardTitle className="text-lg h-14 line-clamp-2" title={product.name}>{product.name}</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0 flex-grow">
              <p className="text-sm text-muted-foreground mb-1">
                Price: {formatCurrency(product.rate)}
              </p>
              {product.unit && (
                 <p className="text-sm text-muted-foreground">
                   Per: {formatCurrency(product.rate)} / {product.unit}
                 </p>
              )}
              {/* We can add a short description here if needed */}
              {/* <p className="text-xs text-gray-600 mt-2 line-clamp-2 h-8">{product.description || ''}</p> */}
            </CardContent>
            <CardFooter className="p-4 border-t">
              <Button 
                className="w-full bg-gradient-to-r from-orange-400 to-orange-600 hover:from-orange-500 hover:to-orange-700 shadow-md transition-all duration-300"
                onClick={() => navigate(`/member/products/${product.id}`)}
              >
                Subscribe
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default MemberProductDisplayPage;
