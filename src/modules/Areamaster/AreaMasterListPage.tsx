import React, { useState, useEffect, useCallback, useRef } from 'react';
import { PlusCircle, Edit, Trash2, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { AreaMaster, getAllAreaMasters, deleteAreaMaster, DeliveryType } from '../../services/areaMasterService'; // Adjusted path if Areamaster is direct child of modules
import AreaMasterForm from './AreaMasterForm';
import { toast } from 'sonner'; // Switched to sonner for notifications
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog'; // Adjust path if needed
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog" // Adjust path if needed
import { Button } from '@/components/ui/button'; // For shadcn buttons if not already used

const AreaMasterListPage: React.FC = () => {
  const [areaMasters, setAreaMasters] = useState<AreaMaster[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalRecords, setTotalRecords] = useState<number>(0);
  const [limit] = useState<number>(10);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('name');
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
      const data = await getAllAreaMasters({
        page: currentPage,
        limit,
        search: searchTerm,
        sortBy,
        sortOrder,
      });
      setAreaMasters(data.areaMasters || []);
      setTotalPages(data.totalPages || 1);
      setTotalRecords(data.totalRecords || 0);
      if (data.areaMasters.length === 0 && searchTerm) {
        toast.info('No area masters found matching your search.');
      } else if (data.areaMasters.length === 0 && !searchTerm && totalRecords === 0) {
        // toast.info('No area masters found.'); // Can be noisy
      }
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to fetch area masters';
      setError(errorMessage);
      toast.error(errorMessage);
    }
    setIsLoading(false);
  }, [currentPage, limit, searchTerm, sortBy, sortOrder, totalRecords]);

  useEffect(() => {
    fetchAreaMasters();
  }, [fetchAreaMasters]);

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
    setCurrentPage(1); // Reset to first page on new search
  };

  const handleSort = (column: string) => {
    const key = column === 'Depot' ? 'depotId' : column.toLowerCase().replace(' ', ''); // Sorting by depot.name would require backend changes, using depotId for now
    if (sortBy === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(key);
      setSortOrder('asc');
    }
    setCurrentPage(1);
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
      await deleteAreaMaster(areaMasterIdToDelete);
      toast.success('Area master deleted successfully');
      if (areaMasters.length === 1 && currentPage > 1) {
        setCurrentPage(currentPage - 1);
      } else {
        fetchAreaMasters();
      }
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to delete area master';
      toast.error(errorMessage);
    }
    setIsDeleteDialogOpen(false); // Close dialog after action
    setAreaMasterIdToDelete(null); // Reset ID
  };
  // The old try-catch block for direct deletion was here and is now removed as its logic is in executeDelete.


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

  const renderPagination = () => {
    if (totalPages <= 1) return null;
    const pageNumbersToShow = 5;
    let startPage = Math.max(1, currentPage - Math.floor(pageNumbersToShow / 2));
    let endPage = Math.min(totalPages, startPage + pageNumbersToShow - 1);

    if (endPage - startPage + 1 < pageNumbersToShow) {
        startPage = Math.max(1, endPage - pageNumbersToShow + 1);
    }

    const pages = [];
    for (let i = startPage; i <= endPage; i++) {
        pages.push(i);
    }

    return (
      <div className="flex justify-center items-center space-x-1 mt-6 mb-2">
        <button
          onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
          disabled={currentPage === 1 || isLoading}
          className="px-3 py-2 border rounded-md bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 shadow-sm"
        >
          <ChevronLeft size={18} />
        </button>
        {startPage > 1 && (
            <button onClick={() => setCurrentPage(1)} className="px-4 py-2 border rounded-md bg-white text-gray-700 hover:bg-gray-50 shadow-sm">1</button>
        )}
        {startPage > 2 && <span className="px-2 py-2 text-gray-500">...</span>}
        {pages.map(num => (
          <button
            key={num}
            onClick={() => setCurrentPage(num)}
            className={`px-4 py-2 border rounded-md shadow-sm ${currentPage === num ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
            disabled={isLoading}
          >
            {num}
          </button>
        ))}
        {endPage < totalPages -1 && <span className="px-2 py-2 text-gray-500">...</span>}
        {endPage < totalPages && (
            <button onClick={() => setCurrentPage(totalPages)} className="px-4 py-2 border rounded-md bg-white text-gray-700 hover:bg-gray-50 shadow-sm">{totalPages}</button>
        )}
        <button
          onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
          disabled={currentPage === totalPages || isLoading}
          className="px-3 py-2 border rounded-md bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 shadow-sm"
        >
          <ChevronRight size={18} />
        </button>
      </div>
    );
  };

  const tableHeaders = ['Name', 'Pincodes', 'Depot', 'Delivery Type', 'Actions'];

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
    <div className="container mx-auto p-6 bg-gray-50 min-h-screen">
      <Dialog open={isFormOpen} onOpenChange={(open) => {
        setIsFormOpen(open);
        if (!open) {
          setEditingAreaMaster(null); // Reset editing state when dialog closes
        }
      }}>
        <div className="bg-white p-8 rounded-xl shadow-lg">
        <h1 className="text-3xl font-semibold mb-6 text-gray-800">Area Master Management</h1>

        <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
          <div className="relative w-full md:w-2/5">
            <input
              type="text"
              placeholder="Search by name or pincodes..."
              value={searchTerm}
              onChange={handleSearchChange}
              className="pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg w-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow"
            />
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          </div>
          <DialogTrigger asChild>
            <Button variant="default" size="lg" onClick={handleAddNew} className="shadow-md hover:shadow-lg transition-all duration-150">
              <PlusCircle size={20} className="mr-2" /> Add New Area
            </Button>
          </DialogTrigger>
        </div>

        {isLoading && <p className="text-center py-6 text-gray-600">Loading area masters...</p>}
        {error && <p className="text-center py-6 text-red-600 font-medium">Error: {error}</p>}

        {!isLoading && !error && areaMasters.length === 0 && (
          <p className="text-center py-10 text-gray-500">No area masters found. {searchTerm ? 'Try adjusting your search.' : 'Click \"Add New Area\" to create one.'}</p>
        )}

        {!isLoading && !error && areaMasters.length > 0 && (
          <div className="overflow-x-auto shadow-lg rounded-lg border border-gray-200">
            <table className="min-w-full bg-white">
              <thead className="bg-gray-100 border-b border-gray-200">
                <tr>
                  {tableHeaders.map(header => (
                    <th
                      key={header}
                      className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-200 transition-colors"
                      onClick={() => header !== 'Actions' && handleSort(header)}
                    >
                      {header}
                      {sortBy === (header === 'Depot' ? 'depot.name' : header.toLowerCase().replace(' ', '')) && (
                        <span className="ml-1">{sortOrder === 'asc' ? '▲' : '▼'}</span>
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {areaMasters.map(am => (
                  <tr key={am.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-800">{am.name}</td>
                    <td className="px-6 py-4 text-sm text-gray-600 max-w-xs">{truncatePincodes(am.pincodes)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{am.depot?.name ?? <span className="text-gray-400">N/A</span>}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${am.deliveryType === DeliveryType.HandDelivery ? 'bg-green-100 text-green-700' : 'bg-purple-100 text-purple-700'}`}>
                        {am.deliveryType.replace(/([A-Z])/g, ' $1').trim()} {/* Format for display */}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-3">
                      <button onClick={() => handleEdit(am)} className="text-blue-600 hover:text-blue-800 transition-colors" title="Edit">
                        <Edit size={18} />
                      </button>
                      <button onClick={() => handleDeleteConfirmation(am.id)} className="text-red-600 hover:text-red-800 transition-colors" title="Delete">
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {totalRecords > 0 && renderPagination()}
        {totalRecords > 0 && 
          <p className="text-center text-sm text-gray-600 mt-2 mb-4">
            Showing {areaMasters.length > 0 ? ((currentPage - 1) * limit) + 1 : 0} - {Math.min(currentPage * limit, totalRecords)} of {totalRecords} records.
          </p>
        }
      </div> {/* This closes the inner white card div */}

        {/* DialogContent is now correctly a child of the encompassing Dialog */}
        <DialogContent className="sm:max-w-[525px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingAreaMaster ? 'Edit Area Master' : 'Add New Area Master'}</DialogTitle>
            <DialogDescription>
              {editingAreaMaster ? 'Update the details of the area master.' : 'Fill in the details to create a new area master.'}
            </DialogDescription>
          </DialogHeader>
          <AreaMasterForm
            initialData={editingAreaMaster}
            onClose={() => setIsFormOpen(false)} // Dialog's onOpenChange handles full close logic
            onSuccess={() => {
              handleFormSuccess(); // This already calls setIsFormOpen(false) via handleFormClose
            }}
          />
          {/* No explicit DialogFooter/DialogClose needed if form has its own submit/cancel that calls onClose */}
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the area master
              and remove its data from our servers.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setAreaMasterIdToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={executeDelete} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {renderCustomTooltip()} {/* Tooltip can be outside Dialog context */}
    </div> /* This closes the outermost container div */
  );
};

export default AreaMasterListPage;
