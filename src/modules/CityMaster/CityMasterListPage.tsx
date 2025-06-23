import React, { useState, useEffect, useCallback } from 'react';
import { PlusCircle, Edit, Trash2, Search } from 'lucide-react';
import { City, getAllCities, deleteCity } from '../../services/cityMasterService';
import CityMasterForm from './CityMasterForm';
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

const CityMasterListPage: React.FC = () => {
  const [cities, setCities] = useState<City[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [currentPage, setCurrentPage] = useState<number>(1);
  
  const [searchTerm, setSearchTerm] = useState<string>('');

  const [isFormOpen, setIsFormOpen] = useState<boolean>(false);
  const [editingCity, setEditingCity] = useState<City | null>(null);

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [cityIdToDelete, setCityIdToDelete] = useState<number | null>(null);

  const recordsPerPage = 10;

  const fetchCities = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getAllCities({
        page: currentPage,
        limit: recordsPerPage,
        search: searchTerm,
      });
      setCities(data.cities);
      
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to fetch cities';
      setError(errorMessage);
      toast.error(errorMessage);
    }
    setIsLoading(false);
  }, [currentPage, searchTerm]);

  useEffect(() => {
    fetchCities();
  }, [fetchCities]);

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
    setCurrentPage(1);
  };

  const handleAddNew = () => {
    setEditingCity(null);
    setIsFormOpen(true);
  };

  const handleEdit = (city: City) => {
    setEditingCity(city);
    setIsFormOpen(true);
  };

  const handleDeleteConfirmation = (id: number) => {
    setCityIdToDelete(id);
    setIsDeleteDialogOpen(true);
  };

  const executeDelete = async () => {
    if (cityIdToDelete === null) return;
    try {
      await deleteCity(cityIdToDelete);
      toast.success('City deleted successfully');
      if (cities.length === 1 && currentPage > 1) {
        setCurrentPage(currentPage - 1);
      } else {
        fetchCities();
      }
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to delete city';
      toast.error(errorMessage);
    }
    setIsDeleteDialogOpen(false);
    setCityIdToDelete(null);
  };

  const handleFormSuccess = () => {
    setIsFormOpen(false);
    fetchCities();
  };

  return (
    <div className="container mx-auto p-6 bg-gray-50 min-h-screen">
      <Dialog open={isFormOpen} onOpenChange={(open) => {
        setIsFormOpen(open);
        if (!open) {
          setEditingCity(null);
        }
      }}>
        <div className="bg-white p-8 rounded-xl shadow-lg">
         <div className='flex justify-between items-center mb-6'>
         <h1 className="text-3xl font-semibold mb-6 text-gray-800">City Master</h1>

          <div className="flex flex-col md:flex-row justify-end items-center mb-6 gap-2">
            <div className="relative w-full max-md:w-2/5">
              <Input
                type="text"
                placeholder="Search by city name..."
                value={searchTerm}
                onChange={handleSearchChange}
                className="pl-10 min-h-10  border border-gray-300 rounded-lg  min-w-32 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow"
              />
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            </div>                            
            <DialogTrigger asChild>
              <Button variant="default" size="lg" onClick={handleAddNew} className="shadow-md hover:shadow-lg transition-all duration-150">
                <PlusCircle size={20} className='mr-2' /> Add New City
              </Button>
            </DialogTrigger>
          </div>
         </div>

          {isLoading && <p>Loading...</p>}
          {error && <p className="text-red-500">{error}</p>}

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>City Name</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {cities.map((city) => (
                <TableRow key={city.id}>
                  <TableCell>{city.name}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(city)}>
                      <Edit size={16} />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDeleteConfirmation(city.id)}>
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
            <DialogTitle>{editingCity ? 'Edit City' : 'Create City'}</DialogTitle>
          </DialogHeader>
          <CityMasterForm initialData={editingCity} onClose={() => setIsFormOpen(false)} onSuccess={handleFormSuccess} />
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the city.
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

export default CityMasterListPage;
