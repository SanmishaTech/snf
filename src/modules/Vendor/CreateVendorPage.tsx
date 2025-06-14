import React from 'react';
import { useNavigate } from 'react-router-dom';
import VendorForm from './VendorForm';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const CreateVendorPage: React.FC = () => {
  const navigate = useNavigate();

  const handleSuccess = () => {
    navigate('/admin/vendors'); // Navigate to vendor list on success
  };

  return (
    <div className="container mx-auto p-4 md:p-6">
      <Card className="w-full mx-auto">
        <CardHeader>
          <CardTitle className="text-2xl font-semibold">Create New Vendor</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-6">
            Fill in the details below to create a new vendor profile and an associated user account.
          </p>
          <VendorForm mode="create" onSuccess={handleSuccess} />
        </CardContent>
      </Card>
    </div>
  );
};

export default CreateVendorPage;
