import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { DeliveryAddress } from './AddressForm';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as apiService from '@/services/apiService';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PlusCircle, Edit, CheckCircle, Trash, Home } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface AddressListProps {
  selectable?: boolean;
  onSelect?: (address: DeliveryAddress) => void;
  selectedAddressId?: string;
}

const AddressList: React.FC<AddressListProps> = ({
  selectable = false,
  onSelect,
  selectedAddressId,
}) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [addressToDelete, setAddressToDelete] = useState<string | null>(null);

  // Fetch addresses
  const {
    data: addresses,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ['addresses'],
    queryFn: async () => {
      const data = await apiService.get('/delivery-addresses');
      return data as DeliveryAddress[];
    },
  });

  // Set default address mutation
  const setDefaultMutation = useMutation({
    mutationFn: async (addressId: string) => {
      return await apiService.patch(`/delivery-addresses/${addressId}/set-default`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['addresses'] });
      toast.success('Default address updated successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update default address');
    },
  });

  // Delete address mutation
  const deleteMutation = useMutation({
    mutationFn: async (addressId: string) => {
      return await apiService.del(`/delivery-addresses/${addressId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['addresses'] });
      toast.success('Address deleted successfully');
      setAddressToDelete(null);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to delete address');
    },
  });

  const handleSetDefault = (addressId: string) => {
    setDefaultMutation.mutate(addressId);
  };

  const handleDelete = (addressId: string) => {
    setAddressToDelete(addressId);
  };

  const confirmDelete = () => {
    if (addressToDelete) {
      deleteMutation.mutate(addressToDelete);
    }
  };

  const handleEdit = (addressId: string) => {
    navigate(`/member/addresses/edit/${addressId}`);
  };

  const handleSelect = (address: DeliveryAddress) => {
    if (selectable && onSelect) {
      onSelect(address);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, index) => (
          <Card key={index} className="w-full">
            <CardContent className="p-4">
              <div className="space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-4 w-5/6" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="text-center p-4 text-red-500">
        Error loading addresses: {(error as any)?.message || 'Unknown error'}
      </div>
    );
  }

  if (!addresses || addresses.length === 0) {
    return (
      <div className="text-center p-8">
        <p className="mb-4">You don't have any saved addresses yet.</p>
        <Button onClick={() => navigate('/member/addresses/create')}>
          <PlusCircle className="mr-2 h-4 w-4" /> Add New Delivery Address
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {!selectable && (
        <div className="flex justify-between items-center mb-4">
          {/* <h2 className="text-xl font-semibold">Your Addresses</h2> */}
        
        </div>
      )}

      {addresses.map((address) => (
        <Card
          key={address.id}
          className={`w-full transition-all ${
            selectable
              ? 'cursor-pointer hover:border-primary hover:shadow-md'
              : ''
          } ${
            selectedAddressId === address.id
              ? 'border-2 border-primary shadow-md'
              : ''
          }`}
          onClick={() => selectable && handleSelect(address)}
        >
          <CardContent className="p-4">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="flex items-center mb-2">
                  <h3 className="font-medium text-lg mr-2">{address.recipientName}</h3>
                  {address.label && (
                    <Badge variant="secondary" className="mr-2 font-normal">
                      {address.label}
                    </Badge>
                  )}
                  {address.isDefault && (
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                      <Home className="h-3 w-3 mr-1" />Default
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-gray-700">
                  {address.plotBuilding}, {address.streetArea}
                  {address.landmark && `, Near ${address.landmark}`}
                </p>
                <p className="text-sm text-gray-700">
                  {address.city}, {address.state} - {address.pincode}
                </p>
                <p className="text-sm text-gray-700 mt-1">Mobile: {address.mobile}</p>
              </div>

              {!selectable && (
                <div className="flex gap-2">
                  {!address.isDefault && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSetDefault(address.id);
                      }}
                    >
                      <CheckCircle className="h-4 w-4 mr-1" /> Set Default
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEdit(address.id);
                    }}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  {/* <Button
                    variant="outline"
                    size="sm"
                    className="text-destructive hover:bg-destructive/10"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(address.id);
                    }}
                  >
                    <Trash className="h-4 w-4" />
                  </Button> */}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ))}

      <AlertDialog open={!!addressToDelete} onOpenChange={(open) => !open && setAddressToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this address. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AddressList;
