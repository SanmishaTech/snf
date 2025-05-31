import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import AddressForm, { DeliveryAddress } from './components/AddressForm';
import * as apiService from '@/services/apiService';
import { Skeleton } from '@/components/ui/skeleton';

const EditAddressPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const {
    data: address,
    isLoading,
    isError,
    error
  } = useQuery({
    queryKey: ['address', id],
    queryFn: async () => {
      if (!id) throw new Error('Address ID is required');
      return await apiService.get(`/delivery-addresses/${id}`);
    }
  });

  const handleSuccess = () => {
    navigate('/member/addresses');
  };

  if (isLoading) {
    return (
      <div className="container py-8">
        <Skeleton className="h-8 w-1/4 mb-4" />
        <Skeleton className="h-4 w-1/3 mb-8" />
        <div className="space-y-6 max-w-3xl mx-auto">
          <Skeleton className="h-[400px] w-full rounded-lg" />
        </div>
      </div>
    );
  }

  if (isError || !address) {
    const errorMessage = (error as any)?.message || 'Failed to load address';
    toast.error(errorMessage);
    return (
      <div className="container py-8 text-center">
        <h1 className="text-2xl font-bold mb-4">Error Loading Address</h1>
        <p className="text-muted-foreground mb-6">{errorMessage}</p>
        <button 
          onClick={() => navigate('/addresses')}
          className="bg-primary text-white px-4 py-2 rounded-md"
        >
          Return to Address List
        </button>
      </div>
    );
  }

  return (
    <div className="container py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Edit Delivery Address</h1>
        <p className="text-muted-foreground">Update your delivery address details</p>
      </div>
      <AddressForm 
        mode="edit" 
        addressId={id} 
        initialData={address as DeliveryAddress} 
        onSuccess={handleSuccess}
      />
    </div>
  );
};

export default EditAddressPage;
