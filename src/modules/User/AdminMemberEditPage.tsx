import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { get, put } from '@/services/apiService';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { LoaderCircle } from 'lucide-react';
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

  const {
    register,
    handleSubmit,
    setValue,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<MemberEditFormInputs>({
    resolver: zodResolver(memberEditSchema),
  });

  // Fetch member data for editing
  useEffect(() => {
    if (memberId) {
      const fetchMemberDetails = async () => {
        try {
          // Assuming memberId from AdminMembersListPage corresponds to a User ID
          const member = await get(`/admin/users/${memberId}`); 
          setValue('name', member.name);
          setValue('email', member.email);
          if (member.mobile) setValue('mobile', member.mobile.toString());
        } catch (error: any) {
          toast.error(error.response?.data?.message || 'Failed to fetch member details');
          navigate('/admin/members'); // Navigate back if member not found or error
        }
      };
      fetchMemberDetails();
    }
  }, [memberId, setValue, navigate]);

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

  return (
    <div className="container mx-auto py-8 px-4 md:px-6 lg:px-8 flex justify-center">
      <Card className="w-full ">
        <CardHeader>
          <CardTitle>Edit Member Details </CardTitle>
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
    </div>
  );
};

export default AdminMemberEditPage;
