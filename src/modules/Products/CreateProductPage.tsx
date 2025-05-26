import React from 'react';
import { useNavigate } from 'react-router-dom';
import ProductForm from './ProductForm'; // Assuming ProductForm is in the same directory
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

const CreateProductPage: React.FC = () => {
  const navigate = useNavigate();

  const handleSuccess = () => {
    navigate('/admin/products'); // Navigate to product list on success
  };

  return (
    <div className="container mx-auto p-4 md:p-6">
      <Button variant="outline" size="sm" onClick={() => navigate("/admin/products")} className="mb-4">
        <ArrowLeft size={16} className="mr-2" />
        Back to Product List
      </Button>
      <Card className="max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle className="text-2xl font-semibold">Create New Product</CardTitle>
          <CardDescription>
            Fill in the details below to add a new product to the inventory.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ProductForm mode="create" onSuccess={handleSuccess} />
        </CardContent>
      </Card>
    </div>
  );
};

export default CreateProductPage;
