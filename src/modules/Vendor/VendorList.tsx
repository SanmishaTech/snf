import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { get, del, patch } from "@/services/apiService";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  CardFooter,
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
  Filter,
  Search,
  PlusCircle,
  MoreHorizontal,
  CheckCircle,
  XCircle,
  ShieldEllipsis,
} from "lucide-react";
import CustomPagination from "@/components/common/custom-pagination";
import ConfirmDialog from "@/components/common/confirm-dialog";
import ChangePasswordDialog from "./ChangePasswordDialog"; // Assuming this will be used for vendor's user
import { Badge } from "@/components/ui/badge";

interface Vendor {
  id: string;
  name: string;
  contactPersonName?: string;
  email: string;
  mobile: string;
  address1: string;
  city: string;
  pincode: string;
  user?: {
    id: string;
    active: boolean;
    fullName: string; // For display if needed
  };
  // Add other vendor-specific fields as necessary
}

interface ApiResponse {
  data: Vendor[];
  totalPages: number;
  totalRecords: number;
}

const fetchVendors = async (
  page: number,
  sortBy: string,
  sortOrder: string,
  search: string,
  active: string, // "all", "true", "false" for user's active status
  recordsPerPage: number
): Promise<ApiResponse | Vendor[]> => {
  const response = await get(
    `/vendors?page=${page}&sortBy=${sortBy}&sortOrder=${sortOrder}&search=${search}&active=${active}&limit=${recordsPerPage}`
  );
  // Handle direct array response as per memory
  if (Array.isArray(response)) {
    return response; // The API might return a direct array
  }
  return response; // Assuming standard paginated response otherwise
};

const VendorList: React.FC = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [currentPage, setCurrentPage] = useState(1);
  const [recordsPerPage, setRecordsPerPage] = useState(10);
  const [sortBy, setSortBy] = useState("name");
  const [sortOrder, setSortOrder] = useState("asc");
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState("all"); // "all", "true", "false"
  const [showFilters, setShowFilters] = useState(false);

  const [showChangePasswordDialog, setShowChangePasswordDialog] = useState(false);
  const [selectedVendorUserId, setSelectedVendorUserId] = useState<string | null>(null);

  const [showConfirmDeleteDialog, setShowConfirmDeleteDialog] = useState(false);
  const [vendorToDeleteId, setVendorToDeleteId] = useState<string | null>(null);

  const {
    data: apiResponse,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["vendors", currentPage, sortBy, sortOrder, search, activeFilter, recordsPerPage] as const,
    queryFn: () => fetchVendors(currentPage, sortBy, sortOrder, search, activeFilter, recordsPerPage),
    placeholderData: (previousData) => previousData,
  });

  // Adapt response based on whether it's a direct array or paginated object
  const vendors: Vendor[] = Array.isArray(apiResponse) ? apiResponse : (apiResponse as ApiResponse)?.data || [];
  const totalPages: number = Array.isArray(apiResponse) ? Math.ceil(apiResponse.length / recordsPerPage) : (apiResponse as ApiResponse)?.totalPages || 1;
  const totalVendors: number = Array.isArray(apiResponse) ? apiResponse.length : (apiResponse as ApiResponse)?.totalRecords || 0;

  const deleteMutation = useMutation<void, Error, string>({
    mutationFn: (vendorId: string) => del(`/vendors/${vendorId}`),
    onSuccess: () => {
      toast.success("Vendor deleted successfully.");
      queryClient.invalidateQueries({ queryKey: ["vendors"] });
      setShowConfirmDeleteDialog(false);
      setVendorToDeleteId(null);
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete vendor: ${error.message}`);
      setShowConfirmDeleteDialog(false);
    },
  });

  const statusMutation = useMutation<
    void,
    Error,
    { vendorUserId: string; active: boolean }
  >({
    mutationFn: ({ vendorUserId, active }: { vendorUserId: string; active: boolean }) => patch(`/users/${vendorUserId}/status`, { active }),
    onSuccess: (_data, variables) => {
      toast.success(
        `Vendor user status updated to ${variables.active ? "Active" : "Inactive"}.`
      );
      queryClient.invalidateQueries({ queryKey: ["vendors"] });
    },
    onError: (error: Error) => {
      toast.error(`Failed to update status: ${error.message}`);
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

  const handleActiveFilterChange = (value: string) => {
    setActiveFilter(value);
    setCurrentPage(1);
  };

  const openChangePasswordDialog = (userId: string) => {
    setSelectedVendorUserId(userId);
    setShowChangePasswordDialog(true);
  };

  const closeChangePasswordDialog = () => {
    setSelectedVendorUserId(null);
    setShowChangePasswordDialog(false);
    queryClient.invalidateQueries({ queryKey: ["vendors"] }); // In case password change affects login status display
  };

  const confirmDeleteVendor = (vendorId: string) => {
    setVendorToDeleteId(vendorId);
    setShowConfirmDeleteDialog(true);
  };

  const handleDeleteVendor = () => {
    if (vendorToDeleteId) {
      deleteMutation.mutate(vendorToDeleteId);
    }
  };

  const handleChangeVendorStatus = (vendor: Vendor) => {
    if (vendor.user && vendor.user.id) {
      statusMutation.mutate({ vendorUserId: vendor.user.id, active: !vendor.user.active });
    } else {
      toast.error("User information not available for this vendor.");
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-2 text-lg">Loading vendors...</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="text-center py-10">
        <p className="text-red-500 text-lg">Error loading vendors: {error?.message}</p>
      </div>
    );
  }

  const getSortIndicator = (column: string) => {
    if (sortBy === column) {
      return sortOrder === "asc" ? <ChevronUp size={16} /> : <ChevronDown size={16} />;
    }
    return null;
  };

  return (
    <div className="container mx-auto py-4 px-2 sm:px-4 md:px-6 lg:px-8">
      <Card className="shadow-lg">
        <CardHeader className="bg-muted/50 p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
            <div>
              <CardTitle className="text-2xl font-semibold">Vendors</CardTitle>
              <CardDescription className="mt-1 text-sm text-muted-foreground">
                Manage your vendors and their details.
              </CardDescription>
            </div>
            <div className="mt-3 sm:mt-0 flex flex-col sm:flex-row gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
                className="w-full sm:w-auto"
              >
                <Filter size={16} className="mr-2" />
                {showFilters ? "Hide" : "Show"} Filters
              </Button>
              <Button
                size="sm"
                onClick={() => navigate("/admin/vendors/create")} // Navigate to create vendor page
                className="w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white"
              >
                <PlusCircle size={16} className="mr-2" />
                Add Vendor
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {showFilters && (
            <div className="p-4 sm:p-6 border-b bg-slate-50">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 items-end">
                <div className="flex-grow">
                  <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">
                    Search Vendors
                  </label>
                  <div className="relative">
                    <Input
                      id="search"
                      type="text"
                       value={search}
                      onChange={handleSearchChange}
                      className="pl-10"
                    />
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  </div>
                </div>
                <div>
                  <label htmlFor="activeFilter" className="block text-sm font-medium text-gray-700 mb-1">
                    User Status
                  </label>
                  <Select value={activeFilter} onValueChange={handleActiveFilterChange}>
                    <SelectTrigger id="activeFilter">
                      <SelectValue  />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Users</SelectItem>
                      <SelectItem value="true">Active Users</SelectItem>
                      <SelectItem value="false">Inactive Users</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}
          {vendors.length > 0 ? (
            <div className="overflow-x-auto px-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead
                      className="pl-6 cursor-pointer hover:bg-muted/80 transition-colors w-[200px]"
                      onClick={() => handleSort("name")}
                    >
                      <div className="flex items-center gap-1">Vendor Name {getSortIndicator("name")}</div>
                    </TableHead>
                    <TableHead
                      className="cursor-pointer hover:bg-muted/80 transition-colors w-[180px]"
                      onClick={() => handleSort("contactPersonName")}
                    >
                       <div className="flex items-center gap-1">Contact Person {getSortIndicator("contactPersonName")}</div>
                    </TableHead>
                    <TableHead
                      className="cursor-pointer hover:bg-muted/80 transition-colors w-[200px]"
                      onClick={() => handleSort("email")}
                    >
                      <div className="flex items-center gap-1">Email {getSortIndicator("email")}</div>
                    </TableHead>
                    <TableHead className="w-[130px]">Mobile</TableHead>
                    <TableHead
                      className="cursor-pointer hover:bg-muted/80 transition-colors w-[120px]"
                      onClick={() => handleSort("city")}
                    >
                      <div className="flex items-center gap-1">City {getSortIndicator("city")}</div>
                    </TableHead>
                    <TableHead
                        className="cursor-pointer hover:bg-muted/80 transition-colors w-[120px] text-center"
                        onClick={() => handleSort("user.active")} // Assuming backend supports sorting by user.active
                    >
                        <div className="flex items-center justify-center gap-1">User Active {getSortIndicator("user.active")}</div>
                    </TableHead>
                    <TableHead className="w-[150px] text-center pr-6">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vendors.map((vendor: Vendor) => (
                    <TableRow key={vendor.id} className="hover:bg-muted/50 transition-colors">
                      <TableCell className="font-medium">{vendor.name}</TableCell>
                      <TableCell>{vendor.contactPersonName || "N/A"}</TableCell>
                      <TableCell>{vendor.email}</TableCell>
                      <TableCell>{vendor.mobile}</TableCell>
                      <TableCell>{vendor.city}</TableCell>
                      <TableCell className="text-center">
                        {vendor.user ? (
                          <Badge variant={vendor.user.active ? "default" : "destructive"}>
                            {vendor.user.active ? "Active" : "Inactive"}
                          </Badge>
                        ) : (
                          <Badge variant="outline">No User</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center space-x-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-blue-600 hover:text-blue-700"
                            onClick={() => navigate(`/admin/vendors/edit/${vendor.id}`)}
                            title="Edit Vendor"
                          >
                            <Edit size={16} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-red-600 hover:text-red-700"
                            onClick={() => confirmDeleteVendor(vendor.id)}
                            title="Delete Vendor"
                          >
                            <Trash2 size={16} />
                          </Button>
                          {/* <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal size={16} />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56">
                              <DropdownMenuGroup>
                                <DropdownMenuItem
                                  onClick={() => handleChangeVendorStatus(vendor)}
                                  disabled={!vendor.user || statusMutation.isPending}
                                >
                                  {vendor.user?.active ? (
                                    <><XCircle size={16} className="mr-2 text-red-500" /> Set Inactive</>
                                  ) : (
                                    <><CheckCircle size={16} className="mr-2 text-green-500" /> Set Active</>
                                  )}
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => vendor.user && openChangePasswordDialog(vendor.user.id)}
                                  disabled={!vendor.user}
                                >
                                  <ShieldEllipsis size={16} className="mr-2" /> Change Password
                                </DropdownMenuItem>
                              </DropdownMenuGroup>
                            </DropdownMenuContent>
                          </DropdownMenu> */}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-10 px-4">
              <Search size={48} className="mx-auto text-gray-400 mb-3" />
              <p className="text-lg font-medium text-gray-700">No vendors found.</p>
              <p className="text-sm text-gray-500">
                Try adjusting your search or filter criteria, or add a new vendor.
              </p>
            </div>
          )}
        </CardContent>
        {vendors.length > 0 && (
            <CardFooter className="p-4 border-t">
                 <CustomPagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    totalRecords={totalVendors}
                    recordsPerPage={recordsPerPage}
                    onPageChange={setCurrentPage}
                    onRecordsPerPageChange={(newPageSize) => {
                        setRecordsPerPage(newPageSize);
                        setCurrentPage(1);
                    }}
                />
            </CardFooter>
        )}
      </Card>

      {selectedVendorUserId && (
        <ChangePasswordDialog
          userId={selectedVendorUserId} // Pass the user ID of the vendor's associated user
          isOpen={showChangePasswordDialog}
          onClose={closeChangePasswordDialog}
        />
      )}

      <ConfirmDialog
        isOpen={showConfirmDeleteDialog}
        title="Confirm Deletion"
        description="Are you sure you want to delete this vendor? This action cannot be undone and might affect related records."
        onCancel={() => {
          setShowConfirmDeleteDialog(false);
          setVendorToDeleteId(null);
        }}
        onConfirm={handleDeleteVendor}
        confirmLabel="Delete Vendor"
      />
    </div>
  );
};

export default VendorList;
