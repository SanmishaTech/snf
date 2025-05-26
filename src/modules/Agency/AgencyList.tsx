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
import ChangePasswordDialog from "./ChangePasswordDialog"; // Will create this file next
import { Badge } from "@/components/ui/badge";

interface Agency {
  id: string;
  name: string;
  mobile: string;
  address1: string;
  address2?: string;
  city: string;
  pincode: string;
  email: string;
  user?: {
    id: string;
    active: boolean;
    fullName: string; // For display if needed
  };
}

interface ApiResponse {
  data: Agency[];
  totalPages: number;
  totalRecords: number;
}

const fetchAgencies = async (
  page: number,
  sortBy: string,
  sortOrder: string,
  search: string,
  active: string, // "all", "true", "false" for user's active status
  recordsPerPage: number
): Promise<ApiResponse | Agency[]> => {
  const response = await get(
    `/agencies?page=${page}&sortBy=${sortBy}&sortOrder=${sortOrder}&search=${search}&active=${active}&limit=${recordsPerPage}`
  );
  // Handle direct array response
  if (Array.isArray(response)) {
    return response; // The API might return a direct array
  }
  return response; // Assuming standard paginated response otherwise
};

const AgencyList: React.FC = () => {
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
  const [selectedAgencyUserId, setSelectedAgencyUserId] = useState<string | null>(null);

  const [showConfirmDeleteDialog, setShowConfirmDeleteDialog] = useState(false);
  const [agencyToDeleteId, setAgencyToDeleteId] = useState<string | null>(null);

  const {
    data: apiResponse,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["agencies", currentPage, sortBy, sortOrder, search, activeFilter, recordsPerPage] as const,
    queryFn: () => fetchAgencies(currentPage, sortBy, sortOrder, search, activeFilter, recordsPerPage),
    placeholderData: (previousData) => previousData,
  });

  // Adapt response based on whether it's a direct array or paginated object
  const agencies: Agency[] = Array.isArray(apiResponse) ? apiResponse : (apiResponse as ApiResponse)?.data || [];
  const totalPages: number = Array.isArray(apiResponse) ? Math.ceil(apiResponse.length / recordsPerPage) : (apiResponse as ApiResponse)?.totalPages || 1;
  const totalAgencies: number = Array.isArray(apiResponse) ? apiResponse.length : (apiResponse as ApiResponse)?.totalRecords || 0;

  const deleteMutation = useMutation({
    mutationFn: (agencyId: string) => del(`/agencies/${agencyId}`),
    onSuccess: () => {
      toast.success("Agency deleted successfully.");
      queryClient.invalidateQueries({ queryKey: ["agencies"] });
      setShowConfirmDeleteDialog(false);
      setAgencyToDeleteId(null);
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete agency: ${error.message}`);
      setShowConfirmDeleteDialog(false);
    },
  });

  const statusMutation = useMutation({
    mutationFn: ({ agencyUserId, active }: { agencyUserId: string; active: boolean }) => 
      patch(`/users/${agencyUserId}/status`, { active }),
    onSuccess: (_data, variables) => {
      toast.success(
        `Agency user status updated to ${variables.active ? "Active" : "Inactive"}.`
      );
      queryClient.invalidateQueries({ queryKey: ["agencies"] });
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
    setSelectedAgencyUserId(userId);
    setShowChangePasswordDialog(true);
  };

  const closeChangePasswordDialog = () => {
    setSelectedAgencyUserId(null);
    setShowChangePasswordDialog(false);
    queryClient.invalidateQueries({ queryKey: ["agencies"] }); // In case password change affects login status display
  };

  const confirmDeleteAgency = (agencyId: string) => {
    setAgencyToDeleteId(agencyId);
    setShowConfirmDeleteDialog(true);
  };

  const handleDeleteAgency = () => {
    if (agencyToDeleteId) {
      deleteMutation.mutate(agencyToDeleteId);
    }
  };

  const handleChangeAgencyStatus = (agency: Agency) => {
    if (agency.user) {
      statusMutation.mutate({
        agencyUserId: agency.user.id,
        active: !agency.user.active,
      });
    }
  };

  const getSortIndicator = (column: string) => {
    if (sortBy === column) {
      return sortOrder === "asc" ? (
        <ChevronUp size={16} />
      ) : (
        <ChevronDown size={16} />
      );
    }
    return null;
  };

  // Dialog state for ConfirmDialog
  const [dialogState, setDialogState] = useState({
    isOpen: false,
    title: "",
    description: "",
    confirmButtonText: "",
    onConfirm: null as (() => void) | null,
  });

  const handleCancelDialog = () => {
    setDialogState({
      ...dialogState,
      isOpen: false,
    });
    setAgencyToDeleteId(null);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleRecordsPerPageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setRecordsPerPage(Number(e.target.value));
    setCurrentPage(1);
  };

  if (isError && error instanceof Error) {
    return (
      <div className="p-4 text-red-600">
        <p>Error loading agencies: {error.message}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="shadow-md">
        <CardHeader className="pb-2">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle className="text-2xl">Agencies</CardTitle>
              <CardDescription>
                Manage your agencies and their details.
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowFilters(!showFilters)}
                className="w-full sm:w-auto"
              >
                <Filter size={16} className="mr-2" />
                {showFilters ? "Hide Filters" : "Show Filters"}
              </Button>
              <Button
                size="sm"
                onClick={() => navigate("/admin/agencies/create")}
                className="w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white"
              >
                <PlusCircle size={16} className="mr-2" />
                Add Agency
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {showFilters && (
            <div className="bg-muted/30 p-4 rounded-md mb-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <label className="text-sm font-medium mb-1 block">
                    Search
                  </label>
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by name, email, or city..."
                      value={search}
                      onChange={handleSearchChange}
                      className="pl-8"
                    />
                  </div>
                </div>
                <div className="w-full sm:w-48">
                  <label className="text-sm font-medium mb-1 block">
                    Status
                  </label>
                  <Select
                    value={activeFilter}
                    onValueChange={handleActiveFilterChange}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All Users" />
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
          {agencies.length > 0 ? (
            <div className="overflow-x-auto px-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead
                      className="pl-6 cursor-pointer hover:bg-muted/80 transition-colors w-[200px]"
                      onClick={() => handleSort("name")}
                    >
                      <div className="flex items-center gap-1">Agency Name {getSortIndicator("name")}</div>
                    </TableHead>
                    <TableHead
                      className="cursor-pointer hover:bg-muted/80 transition-colors w-[180px]"
                      onClick={() => handleSort("mobile")}
                    >
                      <div className="flex items-center gap-1">Mobile {getSortIndicator("mobile")}</div>
                    </TableHead>
                    <TableHead
                      className="cursor-pointer hover:bg-muted/80 transition-colors w-[180px]"
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
                  {agencies.map((agency: Agency) => (
                    <TableRow key={agency.id}>
                      <TableCell className="font-medium">{agency.name}</TableCell>
                      <TableCell>{agency.mobile}</TableCell>
                      <TableCell>{agency.email}</TableCell>
                      <TableCell>{agency.mobile}</TableCell>
                      <TableCell>{agency.city}</TableCell>
                      <TableCell className="text-center">
                        {agency.user && (
                          <Badge 
                            variant={agency.user.active ? "default" : "destructive"}
                            className="inline-flex items-center justify-center"
                          >
                            {agency.user.active ? (
                              <>
                                <CheckCircle size={14} className="mr-1" /> Active
                              </>
                            ) : (
                              <>
                                <XCircle size={14} className="mr-1" /> Inactive
                              </>
                            )}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-center items-center space-x-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-blue-600 hover:text-blue-700"
                            onClick={() => navigate(`/admin/agencies/edit/${agency.id}`)}
                            title="Edit Agency"
                          >
                            <Edit size={16} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-red-600 hover:text-red-700"
                            onClick={() => confirmDeleteAgency(agency.id)}
                            title="Delete Agency"
                          >
                            <Trash2 size={16} />
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                              >
                                <MoreHorizontal size={16} />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuGroup>
                                <DropdownMenuItem
                                  onClick={() => handleChangeAgencyStatus(agency)}
                                  disabled={!agency.user || statusMutation.isPending}
                                >
                                  {agency.user?.active ? (
                                    <><XCircle size={16} className="mr-2 text-red-500" /> Set Inactive</>
                                  ) : (
                                    <><CheckCircle size={16} className="mr-2 text-green-500" /> Set Active</>
                                  )}
                                </DropdownMenuItem>
                                {agency.user && (
                                  <DropdownMenuItem onClick={() => openChangePasswordDialog(agency.user!.id)}>
                                    <ShieldEllipsis size={16} className="mr-2 text-amber-500" /> Change Password
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuGroup>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : !isLoading ? (
            <div className="py-24 flex flex-col items-center justify-center text-center">
              <div className="mb-3 text-muted-foreground">
                <Search size={40} className="mx-auto mb-2" />
                <h3 className="text-lg font-semibold">No agencies found</h3>
              </div>
              <p className="mb-6 text-muted-foreground max-w-sm">
                {search
                  ? "Try a different search term or clear filters"
                  : "Get started by adding your first agency"}
              </p>
              <Button
                onClick={() => navigate("/admin/agencies/create")}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                <PlusCircle size={16} className="mr-2" />
                Add Agency
              </Button>
            </div>
          ) : (
            <div className="flex justify-center items-center py-24">
              <Loader size={30} className="animate-spin" />
            </div>
          )}

          {agencies.length > 0 && (
            <div className="mt-4 flex flex-col sm:flex-row justify-between items-center">
              <div className="mb-4 sm:mb-0 text-sm text-muted-foreground">
                Showing {agencies.length > 0 ? (currentPage - 1) * recordsPerPage + 1 : 0} to{" "}
                {Math.min(currentPage * recordsPerPage, totalAgencies)} of {totalAgencies} records
              </div>
              <div className="flex items-center space-x-6">
                <div className="flex items-center space-x-2">
                  <span className="text-sm whitespace-nowrap">Records per page:</span>
                  <Select
                    value={recordsPerPage.toString()}
                    onValueChange={(value) => {
                      setRecordsPerPage(Number(value));
                      setCurrentPage(1);
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
                  />
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Change Password Dialog */}
      {selectedAgencyUserId && (
        <ChangePasswordDialog
          isOpen={showChangePasswordDialog}
          userId={selectedAgencyUserId}
          onClose={closeChangePasswordDialog}
        />
      )}

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        isOpen={showConfirmDeleteDialog}
        title="Delete Agency"
        description="Are you sure you want to delete this agency? This action cannot be undone."
        onCancel={() => {
          setShowConfirmDeleteDialog(false);
          setAgencyToDeleteId(null);
        }}
        onConfirm={handleDeleteAgency}
        confirmLabel="Delete Agency"
      />
    </div>
  );
};

export default AgencyList;
