import React, { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import { PlusCircle, Edit, Trash2, Search, ChevronsUpDown, ArrowDown, ArrowUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from '@/components/ui/alert-dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import DepotMasterForm, { DepotFormData } from './DepotMasterForm';
import { Pagination } from '@/components/common/Pagination';

interface Depot extends DepotFormData {
  id: string;
  createdAt: string;
}

const API_BASE_URL = '/api/admin/depots';

const DepotMasterListPage: React.FC = () => {
  const [depots, setDepots] = useState<Depot[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingDepot, setEditingDepot] = useState<Depot | undefined>(undefined);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [depotToDelete, setDepotToDelete] = useState<Depot | null>(null);
  const [loading, setLoading] = useState(true);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [sortColumn, setSortColumn] = useState('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const limit = 10;
  
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const fetchDepots = useCallback(async () => {
    setLoading(true);
    try {
      const response = await axios.get(API_BASE_URL, {
        params: {
          page: currentPage,
          limit: limit,
          search: searchTerm,
          sortBy: sortColumn,
          sortOrder: sortOrder,
        },
      });
      setDepots(response.data.depots || []);
      setTotalPages(response.data.totalPages || 1);
      setTotalRecords(response.data.totalRecords || 0);
    } catch (error) {
      console.error('Failed to fetch depots:', error);
      toast.error('Failed to fetch depots.');
      setDepots([]);
    } finally {
      setLoading(false);
    }
  }, [currentPage, searchTerm, sortColumn, sortOrder]);

  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    searchTimeoutRef.current = setTimeout(() => {
      fetchDepots();
    }, 300); // Debounce search
    
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [fetchDepots, searchTerm]); // Add searchTerm to dependency array for debouncing

  const handleAdd = () => {
    setEditingDepot(undefined);
    setIsFormOpen(true);
  };

  const handleEdit = (depot: Depot) => {
    setEditingDepot(depot);
    setIsFormOpen(true);
  };

  const handleDeleteConfirmation = (depot: Depot) => {
    setDepotToDelete(depot);
    setShowDeleteConfirm(true);
  };

  const handleDelete = async () => {
    if (!depotToDelete) return;
    try {
      await axios.delete(`${API_BASE_URL}/${depotToDelete.id}`);
      toast.success('Depot deleted successfully.');
      fetchDepots(); // Refresh list
      setShowDeleteConfirm(false);
      setDepotToDelete(null);
    } catch (error) {
      console.error('Failed to delete depot:', error);
      toast.error('Failed to delete depot.');
      setShowDeleteConfirm(false);
    }
  };

  const handleFormSubmitSuccess = () => {
    fetchDepots();
  };

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortOrder('asc');
    }
    setCurrentPage(1); // Reset to first page on sort
  };

  const SortIndicator = ({ column }: { column: string }) => {
    if (sortColumn !== column) return <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />;
    return sortOrder === 'asc' ? <ArrowUp className="ml-2 h-4 w-4" /> : <ArrowDown className="ml-2 h-4 w-4" />;
  };

  return (
    <div className="container mx-auto p-4 max-w-7xl">
      <Card className="border-0 shadow-sm">
        <CardHeader className="px-6 py-4 border-b">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <CardTitle className="text-2xl font-semibold">Depot Management</CardTitle>
            <div className="flex items-center space-x-2 w-full sm:w-auto">
              <div className="relative flex-grow sm:flex-grow-0">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search depots..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1); 
                  }}
                  className="pl-10 w-full sm:w-64 md:w-80"
                />
              </div>
              <Button onClick={handleAdd} className="gap-2 whitespace-nowrap">
                <PlusCircle className="h-4 w-4" /> Add Depot
              </Button>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="p-0 sm:p-6">
          {loading ? (
            <div className="p-6 space-y-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full rounded-md" />
              ))}
            </div>
          ) : depots.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="bg-slate-100 dark:bg-slate-800 rounded-full p-5 mb-6">
                <Search className="h-10 w-10 text-slate-500 dark:text-slate-400" />
              </div>
              <h3 className="text-xl font-semibold mb-2">
                {searchTerm ? 'No Matching Depots Found' : 'No Depots Yet'}
              </h3>
              <p className="text-muted-foreground max-w-md mb-6">
                {searchTerm
                  ? 'Try adjusting your search criteria or add a new depot.'
                  : 'Get started by adding your first depot. It’s quick and easy!'}
              </p>
              {!searchTerm && (
                <Button onClick={handleAdd} className="gap-2">
                  <PlusCircle className="h-4 w-4" /> Add New Depot
                </Button>
              )}
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table className="min-w-full">
                  <TableHeader className="bg-slate-50 dark:bg-slate-800">
                    <TableRow>
                      <TableHead onClick={() => handleSort('name')} className="cursor-pointer px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center">Name <SortIndicator column='name' /></div>
                      </TableHead>
                      <TableHead onClick={() => handleSort('address')} className="cursor-pointer px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center">Address <SortIndicator column='address' /></div>
                      </TableHead>
                      <TableHead className="px-4 py-3 whitespace-nowrap">Contact Person</TableHead>
                      <TableHead className="px-4 py-3 whitespace-nowrap">Contact Number</TableHead>
                      <TableHead onClick={() => handleSort('createdAt')} className="cursor-pointer px-4 py-3 whitespace-nowrap">
                         <div className="flex items-center">Created At <SortIndicator column='createdAt' /></div>
                      </TableHead>
                      <TableHead className="text-right px-4 py-3 whitespace-nowrap">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {depots.map((depot) => (
                      <TableRow key={depot.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 border-b last:border-b-0">
                        <TableCell className="font-medium px-4 py-3 whitespace-nowrap">{depot.name}</TableCell>
                        <TableCell className="px-4 py-3 whitespace-nowrap">{depot.address}</TableCell>
                        <TableCell className="px-4 py-3 whitespace-nowrap">{depot.contactPerson || '-'}</TableCell>
                        <TableCell className="px-4 py-3 whitespace-nowrap">{depot.contactNumber || '-'}</TableCell>
                        <TableCell className="px-4 py-3 whitespace-nowrap">{new Date(depot.createdAt).toLocaleDateString()}</TableCell>
                        <TableCell className="flex justify-end space-x-2 px-4 py-3 whitespace-nowrap">
                          <Button 
                            variant="outline"
                            size="icon" 
                            onClick={() => handleEdit(depot)}
                            className="hover:bg-slate-100 dark:hover:bg-slate-700"
                            title="Edit Depot"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="outline" 
                            size="icon" 
                            onClick={() => handleDeleteConfirmation(depot)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 dark:text-red-500 dark:hover:text-red-400"
                            title="Delete Depot"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              
              {totalPages > 1 && (
                <div className="p-4 sm:p-6 border-t">
                  <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={setCurrentPage}
                    totalRecords={totalRecords}
                    limit={limit}
                  />
                </div>
              )}
            </>
          )}

          <DepotMasterForm
            isOpen={isFormOpen}
            onClose={() => setIsFormOpen(false)}
            onSubmitSuccess={handleFormSubmitSuccess}
            initialData={editingDepot}
          />

          <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Confirm Deletion</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete this depot? This action cannot be undone and the depot data will be permanently lost.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setDepotToDelete(null)}>Cancel</AlertDialogCancel>
                <AlertDialogAction 
                  onClick={handleDelete}
                  className="bg-red-600 hover:bg-red-700 text-white dark:bg-red-700 dark:hover:bg-red-800"
                >
                  Delete Depot
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>
    </div>
  );
};

export default DepotMasterListPage;
