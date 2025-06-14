import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ChevronLeft, ChevronRight, Search, X } from 'lucide-react';
import { getVariantStocks, VariantStock } from '../../services/variantStockService';
import { getAllDepotsList, DepotListItem } from '../../services/depotService';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableHeader,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
} from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

const VarientstockListPage: React.FC = () => {
  const [depotId, setDepotId] = useState<number | null>(null);
  const [depots, setDepots] = useState<DepotListItem[]>([]);
  const [stocks, setStocks] = useState<VariantStock[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isDepotLoading, setIsDepotLoading] = useState(true);
  const searchTimeout = useRef<NodeJS.Timeout | null>(null);

  const fetchDepots = useCallback(async () => {
    setIsDepotLoading(true);
    try {
      const list = await getAllDepotsList();
      setDepots(list);
      if (list.length) {
        setDepotId(list[0].id);
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to fetch depots');
    } finally {
      setIsDepotLoading(false);
    }
  }, []);

  const fetchStocks = useCallback(async () => {
    if (!depotId) return;
    setIsLoading(true);
    try {
      const res = await getVariantStocks({ 
        depotId, 
        page: currentPage, 
        limit: 10,
        search
      });
      
      setStocks(res.data);
      setTotalPages(res.totalPages || 1);
      setTotalItems(res.totalRecords || res.data.length);
    } catch (err: any) {
      toast.error(err.message || 'Failed to fetch stocks');
    } finally {
      setIsLoading(false);
    }
  }, [depotId, currentPage, search]);

  // Handle search with debounce
  const handleSearch = (value: string) => {
    setSearch(value);
    setCurrentPage(1);
  };

  useEffect(() => {
    fetchDepots();
  }, [fetchDepots]);

  useEffect(() => {
    // Debounce search API calls
    if (searchTimeout.current) {
      clearTimeout(searchTimeout.current);
    }
    
    searchTimeout.current = setTimeout(() => {
      fetchStocks();
    }, 500);
    
    return () => {
      if (searchTimeout.current) {
        clearTimeout(searchTimeout.current);
      }
    };
  }, [fetchStocks]);

  // Reset search
  const clearSearch = () => {
    setSearch('');
    setCurrentPage(1);
  };

  return (
    <div className="container mx-auto p-4 md:p-6">
      <div className="bg-white rounded-xl shadow-sm border p-4 md:p-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-800">Variant Stock</h1>
            <p className="text-sm text-gray-500 mt-1">
              {totalItems} variants across {depots.length} depots
            </p>
          </div>
          
          <div className="w-full md:w-auto flex flex-col-reverse md:flex-row gap-3">
            <div className="relative w-full md:w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              <Input
                className="pl-10 pr-10"
                placeholder="Search products or variants..."
                value={search}
                onChange={(e) => handleSearch(e.target.value)}
              />
              {search && (
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:bg-transparent"
                  onClick={clearSearch}
                >
                  <X size={18} />
                </Button>
              )}
            </div>
            
            <div className="w-full md:w-48">
              <Select 
                value={depotId ? depotId.toString() : undefined} 
                onValueChange={(val) => {
                  setDepotId(parseInt(val, 10));
                  setCurrentPage(1);
                }}
                disabled={isDepotLoading}
              >
                <SelectTrigger>
                  {isDepotLoading ? (
                    <Skeleton className="h-5 w-full" />
                  ) : (
                    <SelectValue placeholder="Select depot" />
                  )}
                </SelectTrigger>
                <SelectContent>
                  {depots.map((d) => (
                    <SelectItem key={d.id} value={d.id.toString()}>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-primary" />
                        {d.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader className="bg-gray-50">
              <TableRow>
                <TableHead className="w-[45%]">Product</TableHead>
                <TableHead className="w-[30%]">Variant</TableHead>
                <TableHead className="text-right w-[25%]">Closing Quantity</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <Skeleton className="h-4 w-3/4" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-2/3" />
                    </TableCell>
                    <TableCell className="text-right">
                      <Skeleton className="h-4 w-1/4 ml-auto" />
                    </TableCell>
                  </TableRow>
                ))
              ) : stocks.length > 0 ? (
                stocks.map((s) => (
                  <TableRow key={s.id} className="hover:bg-gray-50">
                    <TableCell className="font-medium">{s.product.name}</TableCell>
                    <TableCell className="text-gray-600">{s.variant.name}</TableCell>
                    <TableCell className="text-right font-medium">
                      <span className="bg-blue-50 text-blue-700 py-1 px-3 rounded-full text-sm">
                        {s.closingQty}
                      </span>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={3} className="text-center py-10">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Search size={36} className="text-gray-400" />
                      <h3 className="font-medium text-gray-700">No stock records found</h3>
                      <p className="text-sm text-gray-500">
                        Try changing your search or depot selection
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-6 flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="text-sm text-gray-500">
              Showing {stocks.length} of {totalItems} results
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                disabled={currentPage === 1 || isLoading}
              >
                <ChevronLeft size={16} className="mr-1" /> Previous
              </Button>
              
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }
                  
                  return (
                    <Button
                      key={pageNum}
                      variant={currentPage === pageNum ? "solid" : "ghost"}
                      size="sm"
                      onClick={() => setCurrentPage(pageNum)}
                      disabled={isLoading}
                    >
                      {pageNum}
                    </Button>
                  );
                })}
                {totalPages > 5 && currentPage < totalPages - 2 && (
                  <>
                    <span className="px-2">...</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setCurrentPage(totalPages)}
                      disabled={isLoading}
                    >
                      {totalPages}
                    </Button>
                  </>
                )}
              </div>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                disabled={currentPage === totalPages || isLoading}
              >
                Next <ChevronRight size={16} className="ml-1" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default VarientstockListPage;