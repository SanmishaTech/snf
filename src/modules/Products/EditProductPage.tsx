import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import ProductForm from './ProductForm'; // Assuming ProductForm is in the same directory
import { useQuery } from '@tanstack/react-query';
import { get } from '@/services/apiService';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle, ArrowLeft } from 'lucide-react';

// Interface for the product data structure from the API
interface ProductData {
  id: number;
  name: string;
  url?: string | null;
  price: string;
  date: string; // Date as string from API
  quantity: number;
  createdAt: string;
  updatedAt: string;
}

// Interface for the form, with date as Date object
interface ProductFormDataForPage {
  name: string;
  url?: string | null;
  price: string;
  date: Date; // Date as Date object for the form
  quantity: number;
}

const EditProductPage: React.FC = () => {
  const navigate = useNavigate();
  const { id: productId } = useParams<{ id: string }>();

  const fetchProductById = async (id: string): Promise<ProductData> => {
    const response = await get(`/products/${id}`);
    return response;
  };

  const { data: productData, isLoading, isError, error } = useQuery<ProductData, Error> ({
    queryKey: ['product', productId],
    queryFn: () => fetchProductById(productId!),
    enabled: !!productId,
    staleTime: 1000 * 60 * 2, // Cache for 2 minutes
  });

  const handleSuccess = () => {
    navigate('/admin/products');
  };

  if (!productId) {
    return (
      <div className="container mx-auto p-6">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>No Product ID provided. Please go back and select a product to edit.</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <Button variant="outline" size="sm" onClick={() => navigate("/admin/products")} className="mb-4">
          <ArrowLeft size={16} className="mr-2" />
          Back to Product List
        </Button>
        <Card className="max-w-4xl mx-auto">
          <CardHeader>
            <Skeleton className="h-8 w-3/4 mb-2" />
            <Skeleton className="h-4 w-1/2" />
          </CardHeader>
          <CardContent className="space-y-6 pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
            <div className="flex justify-end pt-4">
              <Skeleton className="h-10 w-24 mr-2" />
              <Skeleton className="h-10 w-32" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isError || !productData) {
    return (
      <div className="container mx-auto p-6">
         <Button variant="outline" size="sm" onClick={() => navigate("/admin/products")} className="mb-4">
          <ArrowLeft size={16} className="mr-2" />
          Back to Product List
        </Button>
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error Fetching Product</AlertTitle>
          <AlertDescription>
            There was a problem retrieving the product details. Error: {error?.message || 'Product data not found.'}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Prepare initialData for the form, converting date string to Date object
  const initialFormData: ProductFormDataForPage = {
    ...productData,
    date: new Date(productData.date),
  };

  return (
    <div className="container mx-auto p-4 md:p-6">
      <Button variant="outline" size="sm" onClick={() => navigate("/admin/products")} className="mb-4">
        <ArrowLeft size={16} className="mr-2" />
        Back to Product List
      </Button>
      <Card className="max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle className="text-2xl font-semibold">Edit Product</CardTitle>
          <CardDescription>
            Update the details
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ProductForm
            mode="edit"
            productId={productId}
            initialData={initialFormData}
            onSuccess={handleSuccess}
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default EditProductPage;
