import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { get, put, del } from '@/services/apiService';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { LoaderCircle, MapPin, Edit, Trash2, Plus, Home, Briefcase, MapPinIcon } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DeliveryAddress } from '@/modules/Address/components/AddressForm';
import AdminAddressForm from './components/AdminAddressForm';
import Validate from '@/lib/Handlevalidation'; // Assuming this handles backend validation errors

// Define the Zod schema for member editing
const memberEditSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email address'),
  mobile: z.string().optional()
    .refine(val => !val || /^\d{10,15}$/.test(val), {
      message: 'Mobile number must be 10-15 digits if provided.',
    }),
  // Add other fields if necessary, e.g., address, etc.
  // Note: 'role' and 'active' status are typically handled elsewhere for members.
});

type MemberEditFormInputs = z.infer<typeof memberEditSchema>;

const AdminMemberEditPage: React.FC = () => {
  const { memberId } = useParams<{ memberId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Address management state
  const [addresses, setAddresses] = useState<DeliveryAddress[]>([]);
  const [isLoadingAddresses, setIsLoadingAddresses] = useState(false);
  const [addressDialogOpen, setAddressDialogOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState<DeliveryAddress | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [addressToDelete, setAddressToDelete] = useState<DeliveryAddress | null>(null);
  const [isDeletingAddress, setIsDeletingAddress] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<MemberEditFormInputs>({
    resolver: zodResolver(memberEditSchema),
  });

  // Fetch member data and addresses
  useEffect(() => {
    if (memberId) {
      const fetchMemberDetails = async () => {
        try {
          // Assuming memberId from AdminMembersListPage corresponds to a User ID
          const member = await get(`/admin/users/${memberId}`);
          setValue('name', member.name);
          setValue('email', member.email);
          if (member.mobile) setValue('mobile', member.mobile.toString());

          // Fetch member addresses
          await fetchMemberAddresses();
        } catch (error: any) {
          toast.error(error.response?.data?.message || 'Failed to fetch member details');
          navigate('/admin/members'); // Navigate back if member not found or error
        }
      };
      fetchMemberDetails();
    }
  }, [memberId, setValue, navigate]);

  // Fetch member addresses
  const fetchMemberAddresses = async () => {
    if (!memberId) return;

    setIsLoadingAddresses(true);
    try {
      // Try to fetch addresses using admin endpoint with member filter
      const response = await get(`/admin/delivery-addresses?memberId=${memberId}`);
      setAddresses(response || []);
    } catch (error: any) {
      console.error('Failed to fetch member addresses:', error);
      // If admin endpoint doesn't exist, show empty state
      if (error.status === 404) {
        toast.info('Address management endpoint not yet available');
      } else {
        toast.error('Failed to load member addresses');
      }
      setAddresses([]);
    } finally {
      setIsLoadingAddresses(false);
    }
  };

  // Mutation for updating member details
  const updateMemberMutation = useMutation({
    mutationFn: (data: MemberEditFormInputs) => put(`/admin/users/${memberId}`, data),
    onSuccess: () => {
      toast.success('Member details updated successfully');
      queryClient.invalidateQueries({ queryKey: ['admin-members-list'] }); // To refresh the list on AdminMembersListPage
      queryClient.invalidateQueries({ queryKey: ['user', memberId] }); // To refresh this user's data if cached elsewhere
      navigate('/admin/members');
    },
    onError: (error: any) => {
      Validate(error, setError); // Use your existing validation error handler
      toast.error(error.response?.data?.message || 'Failed to update member details');
    },
  });

  const onSubmit: SubmitHandler<MemberEditFormInputs> = (data) => {
    updateMemberMutation.mutate(data);
  };

  // Address management functions
  const handleAddAddress = () => {
    setEditingAddress(null);
    setAddressDialogOpen(true);
  };

  const handleEditAddress = (address: DeliveryAddress) => {
    setEditingAddress(address);
    setAddressDialogOpen(true);
  };

  const handleDeleteAddress = (address: DeliveryAddress) => {
    setAddressToDelete(address);
    setDeleteDialogOpen(true);
  };

  const confirmDeleteAddress = async () => {
    if (!addressToDelete) return;

    setIsDeletingAddress(true);
    try {
      // Use admin endpoint for deleting addresses if available
      await del(`/admin/delivery-addresses/${addressToDelete.id}`);
      toast.success('Address deleted successfully');
      await fetchMemberAddresses(); // Refresh addresses
      setDeleteDialogOpen(false);
      setAddressToDelete(null);
    } catch (error: any) {
      // Fallback to regular endpoint if admin endpoint doesn't exist
      if (error.status === 404) {
        try {
          await del(`/delivery-addresses/${addressToDelete.id}`);
          toast.success('Address deleted successfully');
          await fetchMemberAddresses();
          setDeleteDialogOpen(false);
          setAddressToDelete(null);
        } catch (fallbackError: any) {
          toast.error(fallbackError.response?.data?.message || 'Failed to delete address');
        }
      } else {
        toast.error(error.response?.data?.message || 'Failed to delete address');
      }
    } finally {
      setIsDeletingAddress(false);
    }
  };

  const handleAddressSuccess = async (data: DeliveryAddress) => {
    setAddressDialogOpen(false);
    setEditingAddress(null);
    await fetchMemberAddresses(); // Refresh addresses
  };

  const getAddressIcon = (label?: string) => {
    switch (label) {
      case 'Home':
        return <Home className="h-4 w-4 text-blue-600" />;
      case 'Work':
        return <Briefcase className="h-4 w-4 text-green-600" />;
      default:
        return <MapPinIcon className="h-4 w-4 text-gray-600" />;
    }
  };

  return (
    <div className="container mx-auto py-8 px-4 md:px-6 lg:px-8 space-y-6">
      {/* Member Details Card */}
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Edit Member Details</CardTitle>
        </CardHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          <CardContent className="space-y-6">
            {/* Name Field */}
            <div className="grid gap-2 relative">
              <Label htmlFor="name">Full Name</Label>
              <Input id="name" type="text" {...register('name')} />
              {errors.name && (
                <span className="text-red-500 text-sm mt-1">
                  {errors.name.message}
                </span>
              )}
            </div>

            {/* Email Field */}
            <div className="grid gap-2 relative">
              <Label htmlFor="email">Email Address</Label>
              <Input id="email" type="email" {...register('email')} />
              {errors.email && (
                <span className="text-red-500 text-sm mt-1">
                  {errors.email.message}
                </span>
              )}
            </div>

            {/* Mobile Field */}
            {/* <div className="grid gap-2 relative">
              <Label htmlFor="mobile">Mobile Number (Optional)</Label>
              <Input id="mobile" type="tel" {...register('mobile')} />
              {errors.mobile && (
                <span className="text-red-500 text-sm mt-1">
                  {errors.mobile.message}
                </span>
              )}
            </div> */}
          </CardContent>
          <CardFooter className="flex justify-end gap-4 pt-6">
            <Button type="button" variant="outline" onClick={() => navigate('/admin/members')} disabled={isSubmitting || updateMemberMutation.isPending}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || updateMemberMutation.isPending} className="flex items-center justify-center gap-2">
              {isSubmitting || updateMemberMutation.isPending ? (
                <>
                  <LoaderCircle className="animate-spin h-4 w-4" />
                  Saving...
                </>
              ) : (
                'Update Customer'
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>

      {/* Address Management Card */}
      <Card className="w-full">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Delivery Addresses
            </CardTitle>
            <Button onClick={handleAddAddress} size="sm" className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Add Address
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoadingAddresses ? (
            <div className="flex items-center justify-center py-8">
              <LoaderCircle className="animate-spin h-6 w-6 mr-2" />
              <span>Loading addresses...</span>
            </div>
          ) : addresses.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <MapPin className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p className="text-lg font-medium mb-2">No addresses found</p>
              <p className="text-sm">This member hasn't added any delivery addresses yet.</p>

            </div>
          ) : (
            <div className="space-y-4">
              {addresses.map((address) => (
                <div
                  key={address.id}
                  className="border rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        {getAddressIcon(address.label)}
                        <span className="font-medium text-sm">
                          {address.label || 'Other'}
                        </span>
                        {address.isDefault && (
                          <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                            Default
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-gray-600 space-y-1">
                        <p className="font-medium text-gray-900">{address.recipientName}</p>
                        <p>{address.plotBuilding}, {address.streetArea}</p>
                        {address.landmark && <p>Near {address.landmark}</p>}
                        <p>{address.city}, {address.state} - {address.pincode}</p>
                        <p className="text-blue-600">📱 {address.mobile}</p>
                      </div>
                    </div>
                    <div className="flex gap-2 ml-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditAddress(address)}
                        className="flex items-center gap-1"
                      >
                        <Edit className="h-3 w-3" />
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteAddress(address)}
                        className="flex items-center gap-1 text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-3 w-3" />
                        Delete
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Address Form Dialog */}
      <Dialog open={addressDialogOpen} onOpenChange={setAddressDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingAddress ? 'Edit Address' : 'Add New Address'}
            </DialogTitle>
          </DialogHeader>
          <AdminAddressForm
            mode={editingAddress ? 'edit' : 'create'}
            memberId={memberId!}
            addressId={editingAddress?.id}
            initialData={editingAddress || undefined}
            onSuccess={handleAddressSuccess}
            onCancel={() => setAddressDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Address</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this address? This action cannot be undone.
              {addressToDelete && (
                <div className="mt-3 p-3 bg-gray-50 rounded-md">
                  <p className="font-medium">{addressToDelete.recipientName}</p>
                  <p className="text-sm text-gray-600">
                    {addressToDelete.plotBuilding}, {addressToDelete.streetArea}, {addressToDelete.city}
                  </p>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeletingAddress}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteAddress}
              disabled={isDeletingAddress}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeletingAddress ? (
                <>
                  <LoaderCircle className="animate-spin h-4 w-4 mr-2" />
                  Deleting...
                </>
              ) : (
                'Delete Address'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminMemberEditPage;
