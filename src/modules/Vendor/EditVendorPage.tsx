import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import VendorForm from './VendorForm';
import { useQuery } from '@tanstack/react-query';
import { get } from '@/services/apiService';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton'; // For loading state
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';

// Define an interface for the vendor data structure
interface VendorUser {
  id: number;
  name: string;
  email: string;
  // Add other user fields if necessary
}

interface VendorData {
  id: number;
  name: string;
  contactPersonName?: string | null;
  email: string; // Vendor's contact email
  mobile: string;
  address1: string;
  address2?: string | null;
  city: string;
  pincode: number;
  alternateMobile?: string | null;
  userId: number;
  user?: VendorUser; // Nested user details, optional if not always populated
  isDairySupplier?: boolean; // Added isDairySupplier
  // Add any other fields returned by your /vendors/:id endpoint
}

const EditVendorPage: React.FC = () => {
  const navigate = useNavigate();
  const { id: vendorId } = useParams<{ id: string }>();

  const fetchVendorById = async (id: string): Promise<VendorData> => {
    const response = await get(`/vendors/${id}`);
    return response; 
  };

  const { data: vendorData, isLoading, isError, error } = useQuery<VendorData, Error>({
    queryKey: ['vendor', vendorId], 
    queryFn: () => fetchVendorById(vendorId!),
    enabled: !!vendorId, 
    staleTime: 1000 * 60 * 5, 
  });

  const handleSuccess = () => {
    navigate('/admin/vendors'); 
  };

  if (!vendorId) {
    return (
      <div className="container mx-auto p-6">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>No Vendor ID provided. Please go back and select a vendor to edit.</AlertDescription>
        </Alert>
      </div>
    );
  }
  
  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <Card className=" mx-auto">
          <CardHeader>
            <Skeleton className="h-8 w-1/2" />
          </CardHeader>
          <CardContent className="space-y-6">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-1/3 ml-auto" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="container mx-auto p-6">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error Fetching Vendor</AlertTitle>
          <AlertDescription>
            There was a problem retrieving the vendor details. Error: {error?.message || 'Unknown error'}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!vendorData) {
    return (
      <div className="container mx-auto p-6">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>Vendor data not found or unavailable.</AlertDescription>
        </Alert>
      </div>
    );
  }

  // Add a check to ensure vendorData is loaded before proceeding
  if (!vendorData) {
    return (
      <div className="container mx-auto p-6">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>Vendor data not found or unavailable after loading.</AlertDescription>
        </Alert>
      </div>
    );
  }

  const initialFormData = {
    name: vendorData.name,
    email: vendorData.email, 
    mobile: vendorData.mobile,
    address1: vendorData.address1,
    address2: vendorData.address2 || null, // Keep null for consistency with form's internal handling
    city: vendorData.city,
    pincode: vendorData.pincode,
    contactPersonName: vendorData.contactPersonName || '', // Changed from vendorData.contactPersonName
    alternateMobile: vendorData.alternateMobile || null, // Keep null for consistency
    // User fields are not directly part of the Vendor schema for update but might be needed for display or context
    // For the VendorForm, we only pass vendor-specific fields if it's in edit mode and not creating a user.
    // However, our VendorForm now has user fields for create mode. For edit mode, these aren't used by the PUT request.
    userFullName: vendorData.user?.name || '', // For potential display, not submission in edit mode
    userLoginEmail: vendorData.user?.email || '', // For potential display, not submission in edit mode
    isDairySupplier: vendorData.isDairySupplier || false, // Added isDairySupplier
  };

  return (
    <div className="container mx-auto p-4 md:p-6">
      <Card className="mx-auto">
        <CardHeader>
          <CardTitle>Edit Vendor: {vendorData.name}</CardTitle>
        </CardHeader>
        <CardContent>
          <VendorForm
            mode="edit"
            vendorId={vendorId}
            initialData={initialFormData}
            onSuccess={handleSuccess}
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default EditVendorPage;
