import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { get, del } from "@/services/apiService";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatCurrency } from "@/lib/formatter"
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuGroup,
} from "@/components/ui/dropdown-menu";
import {
  Loader,
  ChevronUp,
  ChevronDown,
  Edit,
  Trash2,
  Search,
  PlusCircle,
  MoreHorizontal,
  Eye,
} from "lucide-react";
import CustomPagination from "@/components/common/custom-pagination";
import ConfirmDialog from "@/components/common/confirm-dialog";
import { format } from 'date-fns';

interface Product {
  id: number;
  name: string;
  url?: string | null;
  price: string;
  rate: string;  // Added rate
  unit?: string | null; // Added unit
  date: string; 
  quantity: number;
  createdAt: string;
  updatedAt: string;
}

interface ApiResponse {
  data: Product[];
  totalPages: number;
  totalRecords: number;
  currentPage: number;
}

const fetchProducts = async (
  page: number,
  sortBy: string,
  sortOrder: string,
  search: string,
  recordsPerPage: number
): Promise<ApiResponse | Product[]> => {
  const response = await get(
    `/products?page=${page}&sortBy=${sortBy}&sortOrder=${sortOrder}&search=${search}&limit=${recordsPerPage}`
  );
  if (Array.isArray(response)) {
    return response;
  }
  return response as ApiResponse;
};

const ProductList: React.FC = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const location = useLocation();
  const isAdminRoute = location.pathname.includes('/admin/');
  const [currentPage, setCurrentPage] = useState(1);
  const [recordsPerPage, setRecordsPerPage] = useState(10);
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState("desc");
  const [search, setSearch] = useState("");

  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    try {
      const userString = localStorage.getItem('user');
      if (userString) {
        const user = JSON.parse(userString);
        if (user && user.role === 'ADMIN') {
          setIsAdmin(true);
        }
      }
    } catch (error) {
      console.error('Failed to parse user data from localStorage', error);
    }
  }, []);

  const [showConfirmDeleteDialog, setShowConfirmDeleteDialog] = useState(false);
  const [productToDeleteId, setProductToDeleteId] = useState<number | null>(null);

  const {
    data: apiResponse,
    isLoading,
    isError,
    error,
  } = useQuery<ApiResponse | Product[], Error>({
    queryKey: ["products", currentPage, sortBy, sortOrder, search, recordsPerPage] as const,
    queryFn: () => fetchProducts(currentPage, sortBy, sortOrder, search, recordsPerPage),
    placeholderData: (previousData) => previousData,
  });

  const products: Product[] = Array.isArray(apiResponse) ? apiResponse : (apiResponse as ApiResponse)?.data || [];
  const totalPages: number = Array.isArray(apiResponse) ? Math.ceil(apiResponse.length / recordsPerPage) : (apiResponse as ApiResponse)?.totalPages || 1;
  const totalProducts: number = Array.isArray(apiResponse) ? apiResponse.length : (apiResponse as ApiResponse)?.totalRecords || 0;

  const deleteMutation = useMutation<void, Error, number>({
    mutationFn: (productId: number) => del(`/products/${productId}`),
    onSuccess: () => {
      toast.success("Product deleted successfully!");
      queryClient.invalidateQueries({ queryKey: ["products"] });
      setShowConfirmDeleteDialog(false);
      setProductToDeleteId(null);
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete product: ${error.message}`);
      setShowConfirmDeleteDialog(false);
      setProductToDeleteId(null);
    },
  });

  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(column);
      setSortOrder("asc");
    }
    setCurrentPage(1);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setCurrentPage(1);
  };

  const confirmDeleteProduct = (productId: number) => {
    setProductToDeleteId(productId);
    setShowConfirmDeleteDialog(true);
  };

  const handleDeleteProduct = () => {
    if (productToDeleteId !== null) {
      deleteMutation.mutate(productToDeleteId);
    }
  };

  const getSortIndicator = (column: string) => {
    if (sortBy === column) {
      return sortOrder === "asc" ? <ChevronUp size={16} /> : <ChevronDown size={16} />;
    }
    return null;
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleRecordsPerPageChange = (newRecordsPerPage: number) => {
    setRecordsPerPage(newRecordsPerPage);
    setCurrentPage(1);
  };

  if (isError) {
    return (
      <div className="text-red-500 p-4">
        Error fetching products: {error?.message || "Unknown error"}
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Products</CardTitle>
            <CardDescription>
              Manage your product inventory.
            </CardDescription>
          </div>
          <div className="mb-4 flex items-center gap-4">
            <div className="relative w-full max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                 value={search}
                onChange={handleSearchChange}
                className="pl-8 w-full"
              />
            </div>
            <Button
              onClick={() => navigate("/admin/products/create")}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <PlusCircle size={18} className="mr-2" />
              Add Product
            </Button>
          </div>
           
         
        </CardHeader>
        <CardContent>
           

          {isLoading && products.length === 0 ? (
            <div className="flex justify-center items-center py-24">
              <Loader size={30} className="animate-spin text-blue-600" />
            </div>
          ) : !isLoading && products.length === 0 ? (
            <div className="py-24 flex flex-col items-center justify-center text-center">
              <div className="mb-3 text-muted-foreground">
                <Search size={40} className="mx-auto mb-2" />
                <h3 className="text-lg font-semibold">No products found</h3>
              </div>
              <p className="mb-6 text-muted-foreground max-w-sm">
                {search
                  ? "Try a different search term."
                  : "Get started by adding your first product."}
              </p>
              
                <Button
                  onClick={() => navigate("/admin/products/create")}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <PlusCircle size={16} className="mr-2" />
                  Add Product
                </Button>
              
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {/* <TableHead onClick={() => handleSort("id")} className="cursor-pointer">
                      ID {getSortIndicator("id")}
                    </TableHead> */}
                    <TableHead onClick={() => handleSort('name')} className="cursor-pointer hover:bg-muted/50 transition-colors min-w-[150px]">
                      Name {getSortIndicator('name')}
                    </TableHead>
                  
                    <TableHead
                      className="cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => handleSort("price")}
                    >
                      <div className="flex items-center">
                        Price {getSortIndicator("price")}
                      </div>
                    </TableHead>
                    <TableHead
                      className="cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => handleSort("rate")}
                    >
                      <div className="flex items-center">
                        Rate {getSortIndicator("rate")}
                      </div>
                    </TableHead>
                    <TableHead
                      className="cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => handleSort("unit")}
                    >
                      <div className="flex items-center">
                        Unit {getSortIndicator("unit")}
                      </div>
                    </TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.map((product) => (
                    <TableRow key={product.id}>
                      {/* <TableCell>{product.id}</TableCell> */}
                      <TableCell 
                        className="font-medium cursor-pointer hover:text-blue-600 hover:underline" 
                        title={product.name}
                        onClick={() => navigate(isAdminRoute ? `/admin/products/${product.id}` : `/member/products/${product.id}`)}
                      >
                        {product.name}
                      </TableCell>
                      
                      <TableCell>
                        {product.price ? formatCurrency(parseFloat(product.price)) : "N/A"}
                      </TableCell>
                      <TableCell>{product.rate ? formatCurrency(parseFloat(product.rate)) : "N/A"}</TableCell>
                      <TableCell>{product.unit || "N/A"}</TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu modal={false} >
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal size={16} />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuGroup>
                              <DropdownMenuItem
                                onClick={() => navigate(isAdminRoute ? `/admin/products/${product.id}` : `/member/products/${product.id}`)}
                              >
                                <Eye size={14} className="mr-2" /> View
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => navigate(`/admin/products/edit/${product.id}`)}
                              >
                                <Edit size={14} className="mr-2" /> Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => confirmDeleteProduct(product.id)}
                                className="text-red-600 hover:!text-red-700"
                              >
                                <Trash2 size={14} className="mr-2" /> Delete
                              </DropdownMenuItem>
                            </DropdownMenuGroup>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {products.length > 0 && (
            <div className="mt-6 flex flex-col sm:flex-row justify-between items-center">
              <div className="mb-4 sm:mb-0 text-sm text-muted-foreground">
                {`Showing ${products.length > 0 ? (currentPage - 1) * recordsPerPage + 1 : 0} to ${Math.min(currentPage * recordsPerPage, totalProducts)} of ${totalProducts} records`}
              </div>
              <div className="flex items-center space-x-2 sm:space-x-6">
                <div className="flex items-center space-x-2">
                  <span className="text-sm whitespace-nowrap">Rows:</span>
                  <Select
                    value={recordsPerPage.toString()}
                    onValueChange={(value: string) => {
                    const numericValue = parseInt(value, 10);
                    if (!isNaN(numericValue)) {
                      handleRecordsPerPageChange(numericValue);
                    }
                  }}
                  >
                    <SelectTrigger className="h-8 w-[70px]">
                      <SelectValue placeholder={recordsPerPage.toString()} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="5">5</SelectItem>
                      <SelectItem value="10">10</SelectItem>
                      <SelectItem value="20">20</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {totalPages > 1 && (
                  <CustomPagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={handlePageChange}
                    totalRecords={totalProducts}
                    recordsPerPage={recordsPerPage}
                    onRecordsPerPageChange={handleRecordsPerPageChange}
                  />
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <ConfirmDialog
        isOpen={showConfirmDeleteDialog}
        title="Delete Product"
        description="Are you sure you want to delete this product? This action cannot be undone."
        onCancel={() => {
          setShowConfirmDeleteDialog(false);
          setProductToDeleteId(null);
        }}
        onConfirm={handleDeleteProduct}
        confirmLabel="Delete Product"
      />
    </div>
  );
};

export default ProductList;
