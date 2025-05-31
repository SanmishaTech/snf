import React from 'react';
import { useNavigate } from 'react-router-dom';
import AddressList from './components/AddressList';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';

const AddressListPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="container py-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">My Delivery Addresses</h1>
          <p className="text-muted-foreground">Manage your delivery addresses</p>
        </div>
        <Button onClick={() => navigate('/member/addresses/create')}>
          <PlusCircle className="mr-2 h-4 w-4" /> Add New Delivery Address
        </Button>
      </div>
      <AddressList />
    </div>
  );
};

export default AddressListPage;
