import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import VendorForm from './VendorForm';

interface CreateVendorDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void; // To refresh list and close dialog
}

const CreateVendorDialog: React.FC<CreateVendorDialogProps> = ({ isOpen, onClose, onSuccess }) => {
  const handleFormSuccess = () => {
    onSuccess(); // Call the onSuccess prop which should include closing and refreshing
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Create New Vendor</DialogTitle>
          <DialogDescription>
            Fill in the details below to create a new vendor profile and an associated user account.
          </DialogDescription>
        </DialogHeader>
        <VendorForm mode="create" onSuccess={handleFormSuccess} />
      </DialogContent>
    </Dialog>
  );
};

export default CreateVendorDialog;
