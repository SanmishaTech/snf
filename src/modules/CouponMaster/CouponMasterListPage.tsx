import React, { useState, useEffect, useCallback } from 'react';
import { PlusCircle, Edit, Trash2, Search, Percent, Banknote, Calendar as CalendarIcon } from 'lucide-react';


import { Coupon, getAllCoupons, deleteCoupon, DiscountType } from '../../services/couponMasterService';
import CouponMasterForm from './CouponMasterForm.tsx';


import { toast } from 'sonner';
import { format } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const CouponMasterListPage: React.FC = () => {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [currentPage, setCurrentPage] = useState<number>(1);
  const [searchTerm, setSearchTerm] = useState<string>('');

  const [isFormOpen, setIsFormOpen] = useState<boolean>(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [couponIdToDelete, setCouponIdToDelete] = useState<number | null>(null);

  const recordsPerPage = 10;

  const fetchCoupons = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getAllCoupons({
        page: currentPage,
        limit: recordsPerPage,
        search: searchTerm,
      });
      setCoupons(data.coupons);
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to fetch coupons';
      setError(errorMessage);
      toast.error(errorMessage);
    }
    setIsLoading(false);
  }, [currentPage, searchTerm]);

  useEffect(() => {
    fetchCoupons();
  }, [fetchCoupons]);

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
    setCurrentPage(1);
  };

  const handleAddNew = () => {
    setEditingCoupon(null);
    setIsFormOpen(true);
  };

  const handleEdit = (coupon: Coupon) => {
    setEditingCoupon(coupon);
    setIsFormOpen(true);
  };

  const handleDeleteConfirmation = (id: number) => {
    setCouponIdToDelete(id);
    setIsDeleteDialogOpen(true);
  };

  const executeDelete = async () => {
    if (couponIdToDelete === null) return;
    try {
      await deleteCoupon(couponIdToDelete);
      toast.success('Coupon deleted successfully');
      fetchCoupons();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete coupon');
    }
    setIsDeleteDialogOpen(false);
    setCouponIdToDelete(null);
  };

  const handleFormSuccess = () => {
    setIsFormOpen(false);
    fetchCoupons();
  };

  return (
    <div className="container mx-auto p-6 bg-gray-50 min-h-screen">
      <div className="bg-white p-8 rounded-xl shadow-lg">
        <div className='flex flex-col md:flex-row justify-between items-center mb-6 gap-4'>
          <h1 className="text-3xl font-semibold text-gray-800">Coupon Master</h1>

          <div className="flex flex-col md:flex-row justify-end items-center gap-2 w-full md:w-auto">
            <div className="relative w-full md:w-64">
              <Input
                type="text"
                placeholder="Search by code..."
                value={searchTerm}
                onChange={handleSearchChange}
                className="pl-10 min-h-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow"
              />
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            </div>                            
            <Button variant="default" size="lg" onClick={handleAddNew} className="shadow-md hover:shadow-lg transition-all duration-150 w-full md:w-auto">
              <PlusCircle size={20} className='mr-2' /> Add New Coupon
            </Button>
          </div>
        </div>

        {isLoading && <p className="text-center py-4 text-muted-foreground">Loading coupons...</p>}
        {error && <p className="text-red-500 text-center py-4">{error}</p>}

        {!isLoading && !error && (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Coupon Code</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Discount Value</TableHead>
                  <TableHead>Min. Order</TableHead>
                  <TableHead>Validity Period</TableHead>
                  <TableHead>Usage</TableHead>

                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {coupons.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-10 text-muted-foreground">
                      No coupons found. Click "Add New Coupon" to create one.
                    </TableCell>
                  </TableRow>
                ) : (
                  coupons.map((coupon) => (
                    <TableRow key={coupon.id}>
                      <TableCell className="font-bold text-blue-600 uppercase tracking-wider">{coupon.code}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          {coupon.discountType === DiscountType.PERCENTAGE ? (
                            <Percent size={14} className="text-orange-500" />
                          ) : (
                            <Banknote size={14} className="text-green-500" />
                          )}
                          <span className="text-sm">{coupon.discountType}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="font-medium">
                          {coupon.discountType === DiscountType.PERCENTAGE 
                            ? `${coupon.discountValue}%` 
                            : `₹${coupon.discountValue}`}
                        </span>
                      </TableCell>
                      <TableCell>
                        {coupon.minOrderAmount ? `₹${coupon.minOrderAmount}` : 'No minimum'}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1 text-xs">
                          {coupon.fromDate && (
                            <div className="flex items-center gap-1">
                              <span className="text-gray-400 w-8">From:</span>
                              <span className="font-medium">{format(new Date(coupon.fromDate), 'dd MMM yyyy')}</span>
                            </div>
                          )}
                          {coupon.toDate && (
                            <div className="flex items-center gap-1">
                              <CalendarIcon size={12} className="text-gray-400" />
                              <span className="text-gray-400 w-8">To:</span>
                              <span className="font-medium text-orange-600">{format(new Date(coupon.toDate), 'dd MMM yyyy')}</span>
                            </div>
                          )}

                          {!coupon.fromDate && !coupon.toDate && (
                            <span className="text-muted-foreground italic">No date limit</span>
                          )}
                        </div>
                      </TableCell>

                      <TableCell>
                        <span className="text-xs">
                          {coupon.usageCount} / {coupon.usageLimit || '∞'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant={coupon.isActive ? "default" : "secondary"}>
                          {coupon.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(coupon)}>
                            <Edit size={16} />
                          </Button>
                          <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => handleDeleteConfirmation(coupon.id)}>
                            <Trash2 size={16} />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      <Dialog open={isFormOpen} onOpenChange={(open) => {
        setIsFormOpen(open);
        if (!open) {
          setEditingCoupon(null);
        }
      }}>
        <DialogContent className="max-w-md w-full">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-gray-800">
              {editingCoupon ? 'Edit Coupon' : 'Create New Coupon'}
            </DialogTitle>
          </DialogHeader>
          <CouponMasterForm 
            initialData={editingCoupon} 
            onClose={() => setIsFormOpen(false)} 
            onSuccess={handleFormSuccess} 
          />
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to delete this coupon?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. Once deleted, the coupon code will no longer be valid for use in checkout.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={executeDelete} className="bg-red-600 hover:bg-red-700">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default CouponMasterListPage;
