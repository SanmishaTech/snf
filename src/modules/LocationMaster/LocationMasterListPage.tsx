import React, { useState, useEffect, useCallback } from 'react';
import { PlusCircle, Edit, Trash2, Search } from 'lucide-react';
import { Location, getAllLocations, deleteLocation } from '../../services/locationMasterService';
import LocationMasterForm from './LocationMasterForm';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
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
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const LocationMasterListPage: React.FC = () => {
  const [locations, setLocations] = useState<Location[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [currentPage, setCurrentPage] = useState<number>(1);
  
  const [searchTerm, setSearchTerm] = useState<string>('');

  const [isFormOpen, setIsFormOpen] = useState<boolean>(false);
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [locationIdToDelete, setLocationIdToDelete] = useState<number | null>(null);

  const recordsPerPage = 10;

  const fetchLocations = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getAllLocations({
        page: currentPage,
        limit: recordsPerPage,
        search: searchTerm,
      });
      setLocations(data.locations);
      
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to fetch locations';
      setError(errorMessage);
      toast.error(errorMessage);
    }
    setIsLoading(false);
  }, [currentPage, searchTerm]);

  useEffect(() => {
    fetchLocations();
  }, [fetchLocations]);

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
    setCurrentPage(1);
  };

  const handleAddNew = () => {
    setEditingLocation(null);
    setIsFormOpen(true);
  };

  const handleEdit = (location: Location) => {
    setEditingLocation(location);
    setIsFormOpen(true);
  };

  const handleDeleteConfirmation = (id: number) => {
    setLocationIdToDelete(id);
    setIsDeleteDialogOpen(true);
  };

  const executeDelete = async () => {
    if (locationIdToDelete === null) return;
    try {
      await deleteLocation(locationIdToDelete);
      toast.success('Location deleted successfully');
      if (locations.length === 1 && currentPage > 1) {
        setCurrentPage(currentPage - 1);
      } else {
        fetchLocations();
      }
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to delete location';
      toast.error(errorMessage);
    }
    setIsDeleteDialogOpen(false);
    setLocationIdToDelete(null);
  };

  const handleFormSuccess = () => {
    setIsFormOpen(false);
    fetchLocations();
  };

  return (
    <div className="container mx-auto p-6 bg-gray-50 min-h-screen">
      <Dialog open={isFormOpen} onOpenChange={(open) => {
        setIsFormOpen(open);
        if (!open) {
          setEditingLocation(null);
        }
      }}>
        <div className="bg-white p-8 rounded-xl shadow-lg">
         <div className='flex justify-between items-center mb-6'>
         <h1 className="text-3xl font-semibold mb-6 text-gray-800">Location Master</h1>

          <div className="flex flex-col md:flex-row justify-end items-center mb-6 gap-2">
            <div className="relative w-full max-md:w-2/5">
              <Input
                type="text"
                placeholder="Search by location name..."
                value={searchTerm}
                onChange={handleSearchChange}
                className="pl-10 min-h-10  border border-gray-300 rounded-lg  min-w-32 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow"
              />
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            </div>                            
            <DialogTrigger asChild>
              <Button variant="default" size="lg" onClick={handleAddNew} className="shadow-md hover:shadow-lg transition-all duration-150">
                <PlusCircle size={20} className='mr-2' /> Add New Location
              </Button>
            </DialogTrigger>
          </div>
         </div>

          {isLoading && <p>Loading...</p>}
          {error && <p className="text-red-500">{error}</p>}

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Location Name</TableHead>
                <TableHead>City</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {locations.map((location) => (
                <TableRow key={location.id}>
                  <TableCell>{location.name}</TableCell>
                  <TableCell>{location.city.name}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(location)}>
                      <Edit size={16} />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDeleteConfirmation(location.id)}>
                      <Trash2 size={16} />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

        </div>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingLocation ? 'Edit Location' : 'Create Location'}</DialogTitle>
          </DialogHeader>
          <LocationMasterForm initialData={editingLocation} onClose={() => setIsFormOpen(false)} onSuccess={handleFormSuccess} />
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the location.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={executeDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default LocationMasterListPage;
