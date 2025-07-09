import React, { useState, useEffect, useCallback, useRef } from 'react';
import { PlusCircle, Edit, Trash2, Search, ChevronsUpDown, ArrowUp,ArrowDown } from 'lucide-react'; // Removed ChevronLeft, ChevronRight as they are unused with common Pagination
import {
  getAllAreaMasters,
  deleteAreaMaster,
  AreaMaster,
  DeliveryType,
  AreaMasterApiResponse
} from '../../services/areaMasterService';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import AreaMasterForm from './AreaMasterForm';
import { Pagination } from '@/components/common/Pagination'; // Common pagination component

// API_BASE_URL and local type definitions (AreaMaster, DeliveryType) are removed as they are now handled by/imported from areaMasterService

const AreaMasterListPage: React.FC = () => {
  const [areaMasters, setAreaMasters] = useState<AreaMaster[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalRecords, setTotalRecords] = useState<number>(0);
  const limit = 10;
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [sortColumn, setSortColumn] = useState<string>('name'); // Renamed from sortBy for consistency
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const [isFormOpen, setIsFormOpen] = useState<boolean>(false);
  const [editingAreaMaster, setEditingAreaMaster] = useState<AreaMaster | null>(null);
  const [tooltipVisible, setTooltipVisible] = useState(false);
  const [tooltipContent, setTooltipContent] = useState<string[]>([]);
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });
  const [hideTooltipTimeoutId, setHideTooltipTimeoutId] = useState<NodeJS.Timeout | null>(null);
  const moreSpanRef = useRef<HTMLSpanElement | null>(null);

  // State for delete confirmation dialog
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [areaMasterIdToDelete, setAreaMasterIdToDelete] = useState<number | null>(null);

  const fetchAreaMasters = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data: AreaMasterApiResponse = await getAllAreaMasters({
        page: currentPage,
        limit: limit,
        search: searchTerm,
        sortBy: sortColumn,
        sortOrder: sortOrder,
      });
      setAreaMasters(data.areaMasters || []);
      setTotalPages(data.totalPages || 1);
      setTotalRecords(data.totalRecords || 0);
      if (data.message && data.areaMasters.length === 0) { // Optional: Show message from API if no records
        // toast.info(data.message);
      }
    } catch (err: any) {
      // The service function should ideally handle error parsing and rethrow a consistent error object/message
      const errorMessage = err.message || 'Failed to fetch area masters';
      setError(errorMessage);
      toast.error(errorMessage);
      setAreaMasters([]);
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, limit, searchTerm, sortColumn, sortOrder]); // totalRecords removed as it's a result, not a dependency for fetching

  useEffect(() => {
    fetchAreaMasters();
  }, [fetchAreaMasters]);

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
    setCurrentPage(1); // Reset to first page on new search
  };

  const handleSort = (column: string) => {
    // Map display column to API sort key if necessary
    // Example: if display 'Depot Name' maps to 'depot.name' or 'depotName' for API
    const apiSortKey = column === 'Depot' ? 'depot.name' : column.toLowerCase().replace(/\s+/g, '');
    if (sortColumn === apiSortKey) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(apiSortKey);
      setSortOrder('asc');
    }
    setCurrentPage(1); // Reset to first page on sort
  };

  const SortIndicator = ({ column }: { column: string }) => {
    const apiSortKey = column === 'Depot' ? 'depot.name' : column.toLowerCase().replace(/\s+/g, '');
    if (sortColumn !== apiSortKey) return <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />;
    return sortOrder === 'asc' ? <ArrowUp className="ml-2 h-4 w-4 text-blue-600" /> : <ArrowDown className="ml-2 h-4 w-4 text-blue-600" />;
  };

  const handleAddNew = () => {
    setEditingAreaMaster(null);
    // setIsFormOpen(true); // DialogTrigger will handle this, or onOpenChange
  };

  const handleEdit = (areaMaster: AreaMaster) => {
    setEditingAreaMaster(areaMaster);
    setIsFormOpen(true);
  };

  const handleDeleteConfirmation = (id: number) => {
    setAreaMasterIdToDelete(id);
    setIsDeleteDialogOpen(true);
  };

  const executeDelete = async () => {
    if (areaMasterIdToDelete === null) return;
    try {
      const result = await deleteAreaMaster(areaMasterIdToDelete);
      toast.success(result.message || 'Area Master deleted successfully!');
      fetchAreaMasters(); // Refresh the list
      setIsDeleteDialogOpen(false);
      setAreaMasterIdToDelete(null);
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to delete area master';
      toast.error(errorMessage);
      setIsDeleteDialogOpen(false);
    }
  };

  const handleFormClose = () => {
    setIsFormOpen(false);
    setEditingAreaMaster(null);
  };

  const truncatePincodes = (pincodesString: string, maxTagsToShow: number = 3): React.ReactElement => {
    const allPincodes = pincodesString.split(',').map(p => p.trim()).filter(p => p.length === 6);

    if (allPincodes.length === 0) {
      return <span className="text-gray-400">N/A</span>;
    }

    const visibleTags = allPincodes.slice(0, maxTagsToShow);
    const hiddenTagsCount = allPincodes.length - maxTagsToShow;

    const handleMouseEnterMore = (event: React.MouseEvent<HTMLSpanElement>, pincodesToShow: string[]) => {
      // Position tooltip slightly below and to the right of the mouse cursor
      setTooltipPosition({
        top: event.pageY +10, // 15px offset from cursor's Y position
        left: event.pageX - 310  // 10px offset from cursor's X position
      });
      setTooltipContent(pincodesToShow);
      setTooltipVisible(true);
    };
  
    const handleMouseLeaveMore = () => {
      if (hideTooltipTimeoutId) {
        clearTimeout(hideTooltipTimeoutId);
      }
      const timeoutId = setTimeout(() => {
        setTooltipVisible(false);
      }, 300); // 300ms delay before hiding
      setHideTooltipTimeoutId(timeoutId);
    };

    return (
      <div className="flex flex-wrap items-center gap-1 py-1">
        {visibleTags.map(pincode => (
          <span key={pincode} className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
            {pincode}
          </span>
        ))}
        {hiddenTagsCount > 0 && (
          <span 
            ref={moreSpanRef}
            className="px-2 py-0.5 bg-gray-200 text-gray-700 text-xs font-medium rounded-full cursor-help"
            onMouseEnter={(e) => handleMouseEnterMore(e, allPincodes)}
            onMouseLeave={handleMouseLeaveMore}
          >
            +{hiddenTagsCount} more
          </span>
        )}
      </div>
    );
  };

  const handleFormSuccess = () => {
    handleFormClose();
    setCurrentPage(1);
    fetchAreaMasters();
  };

  const renderCustomTooltip = () => {
    if (!tooltipVisible || tooltipContent.length === 0) return null;
    return (
      <div 
        style={{
          position: 'absolute',
          top: `${tooltipPosition.top}px`,
          left: `${tooltipPosition.left}px`,
          zIndex: 1000,
        }}
        className="p-2 bg-white border border-gray-300 rounded-md shadow-lg max-w-xs max-h-48 overflow-y-auto"
        onMouseEnter={() => {
          if (hideTooltipTimeoutId) {
            clearTimeout(hideTooltipTimeoutId);
          }
        }}
        onMouseLeave={() => {
          setTooltipVisible(false);
        }}
      >
        <div className="flex flex-wrap gap-1">
          {tooltipContent.map(pincode => (
            <span key={`tooltip-${pincode}`} className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded-full">
              {pincode}
            </span>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="p-4 md:p-6">
      <Dialog open={isFormOpen} onOpenChange={(open) => {
        setIsFormOpen(open);
        if (!open) {
          setEditingAreaMaster(null);
        }
      }}>
        <Card className="shadow-xl">
          <CardHeader className="px-4 sm:px-6 py-4 sm:py-5 border-b">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <CardTitle className="text-xl sm:text-2xl font-semibold text-slate-800 dark:text-slate-100">
                Area Master Management
              </CardTitle>
              <div className="flex items-center space-x-2 w-full sm:w-auto">
                <div className="relative w-full sm:max-w-xs">
                  <Input
                    type="text"
                    placeholder="Search areas..."
                    value={searchTerm}
                    onChange={handleSearchChange}
                    className="pl-10 pr-4 py-2 w-full border rounded-md focus:ring-2 focus:ring-blue-500 dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200"
                  />
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400 dark:text-slate-500" />
                </div>
                <DialogTrigger asChild>
                  <Button onClick={handleAddNew} className="bg-blue-600 hover:bg-blue-700 text-white whitespace-nowrap">
                    <PlusCircle className="mr-2 h-5 w-5" /> Add New Area
                  </Button>
                </DialogTrigger>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {error && (
              <div className="p-6 text-center text-red-500">
                Error: {error}. Please try refreshing the page.
              </div>
            )}
            {!error && isLoading && (
              <div className="p-4 sm:p-6">
                <div className="space-y-4">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="flex items-center space-x-4 p-2">
                      <Skeleton className="h-8 w-2/6" />
                      <Skeleton className="h-8 w-2/6" />
                      <Skeleton className="h-8 w-1/6" />
                      <Skeleton className="h-8 w-1/6" />
                      <Skeleton className="h-8 w-10" /> 
                    </div>
                  ))}
                </div>
              </div>
            )}
            {!error && !isLoading && (
              <>
                <div className="overflow-x-auto">
                  <Table className="min-w-full">
                    <TableHeader className="bg-slate-50 dark:bg-slate-800/50">
                      <TableRow>
                        <TableHead onClick={() => handleSort('name')} className="px-4 py-3 whitespace-nowrap cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700/50">
                          <div className="flex items-center font-semibold text-xs uppercase tracking-wider text-slate-600 dark:text-slate-300">Name <SortIndicator column='name' /></div>
                        </TableHead>
                        <TableHead className="px-4 py-3 whitespace-nowrap font-semibold text-xs uppercase tracking-wider text-slate-600 dark:text-slate-300">Pincodes</TableHead>
                        <TableHead onClick={() => handleSort('depot.name')} className="px-4 py-3 whitespace-nowrap cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700/50">
                          <div className="flex items-center font-semibold text-xs uppercase tracking-wider text-slate-600 dark:text-slate-300">Depot <SortIndicator column='depot.name' /></div>
                        </TableHead>
                        <TableHead onClick={() => handleSort('deliveryType')} className="px-4 py-3 whitespace-nowrap cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700/50">
                          <div className="flex items-center font-semibold text-xs uppercase tracking-wider text-slate-600 dark:text-slate-300">Delivery Type <SortIndicator column='deliveryType' /></div>
                        </TableHead>
                        <TableHead className="text-right px-4 py-3 whitespace-nowrap font-semibold text-xs uppercase tracking-wider text-slate-600 dark:text-slate-300">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody className="divide-y divide-slate-200 dark:divide-slate-700">
                      {areaMasters.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-10 text-slate-500 dark:text-slate-400">
                            No area masters found. {searchTerm ? "Try adjusting your search." : "Click 'Add New Area' to create one."}
                          </TableCell>
                        </TableRow>
                      ) : (
                        areaMasters.map(am => (
                          <TableRow key={am.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 border-b last:border-b-0">
                            <TableCell className="font-medium px-4 py-3 whitespace-nowrap text-sm text-slate-700 dark:text-slate-200">{am.name}</TableCell>
                            <TableCell className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300 max-w-xs">{truncatePincodes(am.pincodes)}</TableCell>
                            <TableCell className="px-4 py-3 whitespace-nowrap text-sm text-slate-600 dark:text-slate-300">{am.depot?.name ?? <span className="text-slate-400">N/A</span>}</TableCell>
                            <TableCell className="px-4 py-3 whitespace-nowrap text-sm text-slate-600 dark:text-slate-300">
                              <span className={`px-2 py-1 text-xs font-semibold rounded-full ${am.deliveryType === DeliveryType.HandDelivery ? 'bg-green-100 text-green-700 dark:bg-primary/20 dark:text-green-400' : 'bg-purple-100 text-purple-700 dark:bg-purple-700/20 dark:text-purple-400'}`}>
                                {am.deliveryType.replace(/([A-Z])/g, ' $1').trim()}
                              </span>
                            </TableCell>
                            <TableCell className="flex justify-end space-x-2 px-4 py-3 whitespace-nowrap">
                              <Button
                                variant="outline"
                                size="icon"
                                onClick={() => handleEdit(am)}
                                className="hover:bg-slate-100 dark:hover:bg-slate-700"
                                title="Edit Area"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="icon"
                                onClick={() => handleDeleteConfirmation(am.id)}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 dark:text-red-500 dark:hover:text-red-400"
                                title="Delete Area"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
                {totalPages > 1 && (
                  <div className="p-4 sm:p-6 border-t dark:border-slate-700">
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
          </CardContent>
        </Card>

        <DialogContent className="sm:max-w-[525px] max-h-[90vh] overflow-y-auto dark:bg-slate-800">
          <DialogHeader>
            <DialogTitle className="dark:text-slate-100">{editingAreaMaster ? 'Edit Area Master' : 'Add New Area Master'}</DialogTitle>
            <DialogDescription className="dark:text-slate-400">
              {editingAreaMaster ? 'Update the details of the area master.' : 'Fill in the details to create a new area master.'}
            </DialogDescription>
          </DialogHeader>
          <AreaMasterForm
            initialData={editingAreaMaster}
            onClose={() => setIsFormOpen(false)}
            onSuccess={handleFormSuccess}
          />
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent className="dark:bg-slate-800">
          <AlertDialogHeader>
            <AlertDialogTitle className="dark:text-slate-100">Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription className="dark:text-slate-400">
              This action cannot be undone. This will permanently delete the area master
              and remove its data from our servers.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="dark:text-slate-300 dark:border-slate-600 dark:hover:bg-slate-700">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={executeDelete} className="bg-red-600 hover:bg-red-700 text-white dark:bg-red-700 dark:hover:bg-red-800">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {renderCustomTooltip()} 
    </div>
  );
};

export default AreaMasterListPage;
