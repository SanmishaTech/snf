import React, { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';

import { get, post, patch } from '../../services/apiService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { User } from './Teams';

interface UserFormModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onFormSubmitSuccess: () => void;
  userToEdit?: User | null;
}



interface Depot {
  id: string;
  name: string;
}

const UserFormModal: React.FC<UserFormModalProps> = ({ isOpen, onOpenChange, onFormSubmitSuccess, userToEdit }) => {
  const [depots, setDepots] = useState<Depot[]>([]);
  const isEditMode = !!userToEdit;

  const formSchema = useMemo(() => {
    return z.object({
      name: z.string().min(1, 'Name is required'),
      email: z.string().email('Invalid email address'),
      password: isEditMode
        ? z.string().min(8, 'Password must be at least 8 characters').optional().or(z.literal(''))
        : z.string().min(8, 'Password is required and must be at least 8 characters'),
      mobile: z.string()
        .optional()
        .or(z.literal(''))
        .refine(val => !val || /^\d{10}$/.test(val), {
          message: 'Phone number must be 10 digits',
        }),
      depotId: z.string().optional(),
      joiningDate: z.string().optional(),
    });
  }, [isEditMode]);

  type UserFormData = z.infer<typeof formSchema>;

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<UserFormData>({
    resolver: zodResolver(formSchema),
    mode: 'onChange',
  });

  useEffect(() => {
    const fetchDepots = async () => {
      try {
        const response = await get('/admin/depots/all-list');
        setDepots(response || []);
      } catch (err: any) {
        console.error('Failed to fetch depots', err);
        toast.error(err.message || 'Failed to fetch depots');
      }
    };
    fetchDepots();
  }, []);

  useEffect(() => {
    if (userToEdit) {
      reset({
        name: userToEdit.name,
        email: userToEdit.email,
        mobile: userToEdit.mobile || '',
        password: '',
        depotId: userToEdit.depot?.id || undefined,
        joiningDate: userToEdit.joiningDate ? format(new Date(userToEdit.joiningDate), 'yyyy-MM-dd') : '',
      });
    } else {
      reset({
        name: '',
        email: '',
        mobile: '',
        password: '',
        depotId: undefined,
        joiningDate: format(new Date(), 'yyyy-MM-dd'),
      });
    }
  }, [userToEdit, reset, isOpen]);

  const onSubmit = async (data: UserFormData) => {
    try {
      const payload: Partial<UserFormData> = { ...data };
      if (isEditMode && !payload.password) {
        delete payload.password; // Don't send empty password on update
      }

      if (isEditMode) {
        await patch(`/teams/users/${userToEdit?.id}`, payload);
        toast.success('User updated successfully!');
      } else {
        await post('/teams/users', payload);
        toast.success('User created successfully!');
      }
      onFormSubmitSuccess();
    } catch (err: any) {
      console.error(err);
      const errorMessage = err.message || `Failed to ${isEditMode ? 'update' : 'create'} user.`;
      toast.error(errorMessage);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{isEditMode ? 'Edit User' : 'Create New User'}</DialogTitle>
          <DialogDescription>
            {isEditMode ? "Update the user's details below." : "Fill in the form to add a new team member."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" {...register('name')} />
            {errors.name && <p className="text-sm text-red-500">{errors.name.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" {...register('email')} />
            {errors.email && <p className="text-sm text-red-500">{errors.email.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="mobile">Phone (10-digits)</Label>
            <Input id="mobile" {...register('mobile')} />
            {errors.mobile && <p className="text-sm text-red-500">{errors.mobile.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" {...register('password')} placeholder={isEditMode ? 'Leave blank to keep unchanged' : ''} />
            {errors.password && <p className="text-sm text-red-500">{errors.password.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="depotId">Depot (Optional)</Label>
            <Select onValueChange={(value) => setValue('depotId', value === 'admin-role' ? undefined : value)} defaultValue={userToEdit?.depot?.id}>
              <SelectTrigger id="depotId">
                <SelectValue placeholder="Assign as Admin" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin-role">Assign as Admin</SelectItem>
                {depots.map((depot) => (
                  <SelectItem key={depot.id} value={depot.id}>
                    {depot.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.depotId && <p className="text-sm text-red-500">{errors.depotId.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="joiningDate">Joining Date</Label>
            <Input id="joiningDate" type="date" {...register('joiningDate')} />
            {errors.joiningDate && <p className="text-sm text-red-500">{errors.joiningDate.message}</p>}
          </div>
          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (isEditMode ? 'Updating...' : 'Creating...') : (isEditMode ? 'Update User' : 'Create User')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default UserFormModal;
