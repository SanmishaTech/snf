import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as apiService from '@/services/apiService';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { CheckCircle, Home, Loader2, MapPin, Pencil, Plus, User as UserIcon } from 'lucide-react';
import AddressForm, { type DeliveryAddress } from '@/modules/Address/components/AddressForm';

interface AddressDropdownProps {
  trigger?: React.ReactNode;
}

export const AddressDropdown: React.FC<AddressDropdownProps> = ({ trigger }) => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [open, setOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<DeliveryAddress | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data: addresses, isLoading, isError, error } = useQuery({
    queryKey: ['addresses'],
    enabled: isAuthenticated && open, // load when dropdown opens
    queryFn: async () => {
      const data = await apiService.get('/delivery-addresses');
      return data as DeliveryAddress[];
    },
  });

  // Note: If needed in future, we can pre-select the default address here.

  const setDefaultMutation = useMutation({
    mutationFn: async (addressId: string) => {
      return await apiService.patch(`/delivery-addresses/${addressId}/set-default`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['addresses'] });
      toast.success('Default address updated');
      setOpen(false);
    },
    onError: (e: any) => {
      toast.error(e?.message || 'Failed to set default');
    },
  });

  const handleSelect = (addr: DeliveryAddress) => {
    setSelectedId(addr.id);
    setDefaultMutation.mutate(addr.id);
  };

  const handleAddNew = () => {
    setEditing(null);
    setModalOpen(true);
  };

  const handleEdit = (addr: DeliveryAddress) => {
    setEditing(addr);
    setModalOpen(true);
  };

  const afterSave = () => {
    queryClient.invalidateQueries({ queryKey: ['addresses'] });
    setModalOpen(false);
  };

  return (
    <>
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger asChild>
          {trigger ?? (
            <Button variant="ghost" size="icon" aria-label="Account / Address selector">
              <UserIcon className="h-5 w-5" />
            </Button>
          )}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" sideOffset={8} className="w-96 z-[60]">
          <DropdownMenuLabel className="flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            Select delivery address
          </DropdownMenuLabel>
          <DropdownMenuSeparator />

          {!isAuthenticated ? (
            <div className="p-3 text-sm">
              <p className="text-muted-foreground mb-3">Please log in to view and manage your delivery addresses.</p>
              <Button size="sm" onClick={() => navigate('/login')}>Login</Button>
            </div>
          ) : isLoading ? (
            <div className="p-3 space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex items-start gap-3">
                  <Skeleton className="h-5 w-5 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-2/3" />
                    <Skeleton className="h-3 w-5/6" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : isError ? (
            <div className="p-3 text-sm">
              <p className="text-destructive mb-2">{(error as any)?.message || 'Failed to load addresses'}</p>
              <Button variant="outline" size="sm" onClick={() => queryClient.invalidateQueries({ queryKey: ['addresses'] })}>Retry</Button>
            </div>
          ) : (
            <div className="max-h-96 overflow-auto p-1">
              {addresses && addresses.length > 0 ? (
                <ul className="space-y-2">
                  {addresses.map((addr) => (
                    <li key={addr.id} className="rounded-md border hover:border-primary/60 transition-colors">
                      <button
                        type="button"
                        onClick={() => handleSelect(addr)}
                        className={`w-full text-left p-3 flex items-start gap-2 ${selectedId === addr.id ? 'bg-primary/5' : ''}`}
                      >
                        <div className="mt-1">
                          {setDefaultMutation.isPending && selectedId === addr.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : addr.isDefault ? (
                            <Home className="h-4 w-4 text-green-600" />
                          ) : (
                            <CheckCircle className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{addr.recipientName}</span>
                            {addr.label && <Badge variant="secondary">{addr.label}</Badge>}
                            {addr.isDefault && (
                              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Default</Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {addr.plotBuilding}{addr.plotBuilding && addr.streetArea ? ', ' : ''}{addr.streetArea}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {addr.city}, {addr.state} - {addr.pincode}
                          </p>
                          {!!addr.landmark && (
                            <p className="text-xs text-muted-foreground">Landmark: {addr.landmark}</p>
                          )}
                          <p className="text-xs text-muted-foreground">Mobile: {addr.mobile}</p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="ml-2"
                          onClick={(e) => { e.stopPropagation(); handleEdit(addr); }}
                          aria-label="Edit address"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="p-3 text-sm text-muted-foreground">You have no saved addresses yet.</div>
              )}

              <div className="p-2 pt-3">
                <Button size="sm" className="w-full" onClick={handleAddNew}>
                  <Plus className="h-4 w-4 mr-2" /> Add New Address
                </Button>
              </div>
            </div>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-[620px]">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Address' : 'Add New Address'}</DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <AddressForm
              mode={editing ? 'edit' : 'create'}
              addressId={editing?.id}
              initialData={editing || undefined}
              onSuccess={() => afterSave()}
              onCancel={() => setModalOpen(false)}
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default AddressDropdown;
