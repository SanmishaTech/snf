import React, { useState } from 'react';
import { PlusCircle, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import TeamList from './TeamList';
import UserFormModal from './UserFormModal';

// Define User type to be shared between components
export interface User {
  id: string;
  name: string;
  email: string;
  mobile?: string;
  role: 'ADMIN' | 'AGENCY' | 'MEMBER' | 'DepotAdmin';
  depot?: { id: string; name: string };
  createdAt: string;
  joiningDate: string;
  active: boolean;
}

const Teams: React.FC = () => {
      const [isModalOpen, setIsModalOpen] = useState(false);
  const [userToEdit, setUserToEdit] = useState<User | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

        const handleOpenModal = (user: User | null = null) => {
    setUserToEdit(user);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setUserToEdit(null); // Clear user on close
  };

  const handleFormSubmitSuccess = () => {
    handleCloseModal();
    setRefreshKey(prev => prev + 1); // Refresh the list
  };

  const handleEdit = (user: User) => handleOpenModal(user);

  return (
    <div className="container mx-auto p-4 max-w-7xl">
      <Card className="border-0 shadow-sm">
        <CardHeader className="px-6 py-4 border-b">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <CardTitle className="text-2xl font-semibold">Team Management</CardTitle>
            <div className="flex items-center space-x-2 w-full sm:w-auto">
              <div className="relative flex-grow sm:flex-grow-0">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search users..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-full sm:w-64 md:w-80"
                />
              </div>
                                          <Button onClick={() => handleOpenModal()} className="gap-2 whitespace-nowrap">
                <PlusCircle className="h-4 w-4" /> Add User
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <TeamList key={refreshKey} searchTerm={searchTerm} onEditUser={handleEdit} refreshKey={refreshKey} />
        </CardContent>
      </Card>

      {isModalOpen && (
        <UserFormModal
          isOpen={isModalOpen}
          onOpenChange={setIsModalOpen}
          onFormSubmitSuccess={handleFormSubmitSuccess}
          userToEdit={userToEdit}
        />
      )}
    </div>
  );
};

export default Teams;
