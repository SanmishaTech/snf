import React, { useState, useEffect, useCallback } from 'react';
import { PlusCircle, Edit, Trash2, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { Category, getAllCategories, deleteCategory } from '../../services/categoryMasterService';
import { backendUrl } from '../../config';
import CategoryMasterForm from './CategoryMasterForm';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
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

const CategoryMasterListPage: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalRecords, setTotalRecords] = useState<number>(0);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('name'); // Default sort by name
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const [isFormOpen, setIsFormOpen] = useState<boolean>(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [categoryIdToDelete, setCategoryIdToDelete] = useState<number | null>(null);

  const recordsPerPage = 10;

  const fetchCategories = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getAllCategories({
        page: currentPage,
        limit: recordsPerPage,
        search: searchTerm,
        sortBy: sortBy,
        sortOrder: sortOrder,
      });
      setCategories(data.categories);
      setTotalPages(data.totalPages);
      setTotalRecords(data.totalRecords);
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to fetch categories';
      setError(errorMessage);
      toast.error(errorMessage);
    }
    setIsLoading(false);
  }, [currentPage, searchTerm, sortBy, sortOrder]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
    setCurrentPage(1); // Reset to first page on search
  };

  const handleSort = (key: string) => {
    if (sortBy === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(key);
      setSortOrder('asc');
    }
    setCurrentPage(1);
  };

  const handleAddNew = () => {
    setEditingCategory(null);
    setIsFormOpen(true);
  };

  const handleEdit = (category: Category) => {
    setEditingCategory(category);
    setIsFormOpen(true);
  };

  const handleDeleteConfirmation = (id: number) => {
    setCategoryIdToDelete(id);
    setIsDeleteDialogOpen(true);
  };

  const executeDelete = async () => {
    if (categoryIdToDelete === null) return;
    try {
      await deleteCategory(categoryIdToDelete);
      toast.success('Category deleted successfully');
      if (categories.length === 1 && currentPage > 1) {
        setCurrentPage(currentPage - 1); // Go to previous page if last item on current page is deleted
      } else {
        fetchCategories(); // Re-fetch to update list
      }
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to delete category';
      toast.error(errorMessage);
    }
    setIsDeleteDialogOpen(false);
    setCategoryIdToDelete(null);
  };

  const handleFormSuccess = () => {
    setIsFormOpen(false);
    fetchCategories(); // Refresh list on success
  };

  const renderPagination = () => {
    if (totalPages <= 1) return null;
    const pageNumbers = [];
    for (let i = 1; i <= totalPages; i++) {
      pageNumbers.push(i);
    }

    return (
      <div className="flex justify-center items-center space-x-2 mt-6">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
          disabled={currentPage === 1}
        >
          <ChevronLeft size={16} className="mr-1" /> Previous
        </Button>
        {pageNumbers.map(num => (
          <Button
            key={num}
            variant={currentPage === num ? 'default' : 'outline'}
            size="sm"
            onClick={() => setCurrentPage(num)}
          >
            {num}
          </Button>
        ))}
        <Button
          variant="outline"
          size="sm"
          onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
          disabled={currentPage === totalPages}
        >
          Next <ChevronRight size={16} className="ml-1" />
        </Button>
      </div>
    );
  };

  const tableHeaders = ['Image', 'ID', 'Category Name', 'Actions'];

  return (
    <div className="container mx-auto p-6 bg-gray-50 min-h-screen">
      <Dialog open={isFormOpen} onOpenChange={(open) => {
        setIsFormOpen(open);
        if (!open) {
          setEditingCategory(null);
        }
      }}>
        <div className="bg-white p-8 rounded-xl shadow-lg">
          <h1 className="text-3xl font-semibold mb-6 text-gray-800">Category Master</h1>

          <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
            <div className="relative w-full md:w-2/5">
              <Input
                type="text"
                placeholder="Search by category name..."
                value={searchTerm}
                onChange={handleSearchChange}
                className="pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg w-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow"
              />
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            </div>
            <DialogTrigger asChild>
              <Button variant="default" size="lg" onClick={handleAddNew} className="shadow-md hover:shadow-lg transition-all duration-150">
                <PlusCircle size={20} className="mr-2" /> Add New Category
              </Button>
            </DialogTrigger>
          </div>

          {isLoading && <p className="text-center py-6 text-gray-600">Loading categories...</p>}
          {error && <p className="text-center py-6 text-red-600 font-medium">Error: {error}</p>}

          {!isLoading && !error && categories.length === 0 && (
            <p className="text-center py-10 text-gray-500">No categories found. {searchTerm ? 'Try adjusting your search.' : 'Click "Add New Category" to create one.'}</p>
          )}

          {!isLoading && !error && categories.length > 0 && (
            <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-100 hover:bg-gray-100">
                    {tableHeaders.map(header => (
                      <TableHead
                        key={header}
                        className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-200 transition-colors"
                        onClick={() => header !== 'Actions' && header !== 'Image' && handleSort(header === 'Category Name' ? 'name' : header.toLowerCase())}
                      >
                        {header}
                        {header !== 'Image' && sortBy === (header === 'Category Name' ? 'name' : header.toLowerCase()) && (
                          <span className="ml-1">{sortOrder === 'asc' ? '▲' : '▼'}</span>
                        )}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-gray-200">
                  {categories.map(cat => (
                    <TableRow key={cat.id} className="hover:bg-gray-50 transition-colors">
                      <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {cat.imageUrl ? (
                          <img src={`${backendUrl}${cat.imageUrl}`} alt={cat.name} className="h-10 w-10 rounded-md object-cover" />
                        ) : (
                          <div className="h-10 w-10 rounded-md bg-gray-100 flex items-center justify-center text-xs text-gray-400">No Image</div>
                        )}
                      </TableCell>
                      <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{cat.id}</TableCell>
                      <TableCell className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-800">{cat.name}</TableCell>
                      <TableCell className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-3">
                        <button onClick={() => handleEdit(cat)} className="text-blue-600 hover:text-blue-800 transition-colors" title="Edit">
                          <Edit size={18} />
                        </button>
                        <button onClick={() => handleDeleteConfirmation(cat.id)} className="text-red-600 hover:text-red-800 transition-colors" title="Delete">
                          <Trash2 size={18} />
                        </button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {totalRecords > 0 && renderPagination()}
        </div>

        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{editingCategory ? 'Edit Category' : 'Add New Category'}</DialogTitle>
            <DialogDescription>
              {editingCategory ? 'Update the details of the category.' : 'Fill in the details to add a new category.'}
            </DialogDescription>
          </DialogHeader>
          <CategoryMasterForm
            initialData={editingCategory}
            onClose={() => setIsFormOpen(false)}
            onSuccess={handleFormSuccess}
          />
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the category.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setCategoryIdToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={executeDelete} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default CategoryMasterListPage;
