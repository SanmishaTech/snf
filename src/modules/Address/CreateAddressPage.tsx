import React from 'react';
import { useNavigate } from 'react-router-dom';
import AddressForm from './components/AddressForm';

const CreateAddressPage: React.FC = () => {
  const navigate = useNavigate();

  const handleSuccess = () => {
    navigate('/member/addresses');
  };

  return (
    <div className="container py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Add New Delivery Address</h1>
        <p className="text-muted-foreground">Create a new delivery address for your account</p>
      </div>
      <AddressForm mode="create" onSuccess={handleSuccess} />
    </div>
  );
};

export default CreateAddressPage;
