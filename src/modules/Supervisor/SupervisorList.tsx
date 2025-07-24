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

interface Supervisor {
  id: string;
  name: string;
  mobile: string;
  address1: string;
  address2?: string;
  city: string;
  pincode: string;
  email: string;
  depotId?: number;
  depot?: {
    id: number;
    name: string;
  };
  user?: {
    id: string;
    active: boolean;
    fullName: string; // For display if needed
  };
}

interface ApiResponse {
  data: Supervisor[];
  totalPages: number;
  totalRecords: number;
}

const fetchSupervisors = async (
  page: number,
  sortBy: string,
  sortOrder: string,
  search: string,
  active: string, // "all", "true", "false" for user's active status
  recordsPerPage: number
): Promise<ApiResponse | Supervisor[]> => {
  const response = await get(
    `/supervisors?page=${page}&sortBy=${sortBy}&sortOrder=${sortOrder}&search=${search}&active=${active}&limit=${recordsPerPage}`
  );
  // Handle direct array response
  if (Array.isArray(response)) {
    return response; // The API might return a direct array
  }
  return response; // Assuming standard paginated response otherwise
};

const SupervisorList: React.FC = () => {
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
  const [selectedSupervisorUserId, setSelectedSupervisorUserId] = useState<string | null>(null);

  const [showConfirmDeleteDialog, setShowConfirmDeleteDialog] = useState(false);
  const [supervisorToDeleteId, setSupervisorToDeleteId] = useState<string | null>(null);

  const {
    data: apiResponse,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["supervisors", currentPage, sortBy, sortOrder, search, activeFilter, recordsPerPage] as const,
    queryFn: () => fetchSupervisors(currentPage, sortBy, sortOrder, search, activeFilter, recordsPerPage),
    placeholderData: (previousData) => previousData,
  });

  // Adapt response based on whether it's a direct array or paginated object
  const supervisors: Supervisor[] = Array.isArray(apiResponse) ? apiResponse : (apiResponse as ApiResponse)?.data || [];
  const totalPages: number = Array.isArray(apiResponse) ? Math.ceil(apiResponse.length / recordsPerPage) : (apiResponse as ApiResponse)?.totalPages || 1;
  const totalSupervisors: number = Array.isArray(apiResponse) ? apiResponse.length : (apiResponse as ApiResponse)?.totalRecords || 0;

  const deleteMutation = useMutation({
    mutationFn: (supervisorId: string) => del(`/supervisors/${supervisorId}`),
    onSuccess: () => {
      toast.success("Supervisor deleted successfully.");
      queryClient.invalidateQueries({ queryKey: ["supervisors"] });
      setShowConfirmDeleteDialog(false);
      setSupervisorToDeleteId(null);
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete supervisor: ${error.message}`);
      setShowConfirmDeleteDialog(false);
    },
  });

  const statusMutation = useMutation({
    mutationFn: ({ supervisorUserId, active }: { supervisorUserId: string; active: boolean }) => 
      patch(`/users/${supervisorUserId}/status`, { active }),
    onSuccess: (_data, variables) => {
      toast.success(
        `Supervisor user status updated to ${variables.active ? "Active" : "Inactive"}.`
      );
      queryClient.invalidateQueries({ queryKey: ["supervisors"] });
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
    setSelectedSupervisorUserId(userId);
    setShowChangePasswordDialog(true);
  };

  const closeChangePasswordDialog = () => {
    setSelectedSupervisorUserId(null);
    setShowChangePasswordDialog(false);
    queryClient.invalidateQueries({ queryKey: ["supervisors"] }); // In case password change affects login status display
  };

  const confirmDeleteSupervisor = (supervisorId: string) => {
    setSupervisorToDeleteId(supervisorId);
    setShowConfirmDeleteDialog(true);
  };

  const handleDeleteSupervisor = () => {
    if (supervisorToDeleteId) {
      deleteMutation.mutate(supervisorToDeleteId);
    }
  };

  const handleChangeSupervisorStatus = (supervisor: Supervisor) => {
    if (supervisor.user) {
      statusMutation.mutate({
        supervisorUserId: supervisor.user.id,
        active: !supervisor.user.active,
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
    setSupervisorToDeleteId(null);
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
        <p>Error loading supervisors: {error.message}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="shadow-md">
        <CardHeader className="pb-2">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle className="text-2xl">Supervisors</CardTitle>
              <CardDescription>
                Manage your supervisors and their details.
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
                onClick={() => navigate("/admin/supervisors/create")}
                className="w-full sm:w-auto bg-green-600 hover:bg-primary text-white"
              >
                <PlusCircle size={16} className="mr-2" />
                Add Supervisor
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
                      <SelectValue />
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
          {supervisors.length > 0 ? (
            <div className="overflow-x-auto px-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead
                      className="pl-6 cursor-pointer hover:bg-muted/80 transition-colors w-[200px]"
                      onClick={() => handleSort("name")}
                    >
                      <div className="flex items-center gap-1">Supervisor Name {getSortIndicator("name")}</div>
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
                    <TableHead className="w-[150px]">Assigned Depot</TableHead>
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
                  {supervisors.map((supervisor: Supervisor) => (
                    <TableRow key={supervisor.id}>
                      <TableCell className="font-medium">{supervisor.name}</TableCell>
                      <TableCell>{supervisor.email}</TableCell>
                      <TableCell>{supervisor.mobile}</TableCell>
                      <TableCell>{supervisor.city}</TableCell>
                      <TableCell>
                        {supervisor.depot ? (
                          <Badge variant="outline" className="text-xs">
                            {supervisor.depot.name}
                          </Badge>
                        ) : (
                          <span className="text-gray-400 text-sm">None</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {supervisor.user && (
                          <Badge 
                            variant={supervisor.user.active ? "default" : "destructive"}
                            className="inline-flex items-center justify-center"
                          >
                            {supervisor.user.active ? (
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
                            onClick={() => navigate(`/admin/supervisors/edit/${supervisor.id}`)}
                            title="Edit Supervisor"
                          >
                            <Edit size={16} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-red-600 hover:text-red-700"
                            onClick={() => confirmDeleteSupervisor(supervisor.id)}
                            title="Delete Supervisor"
                          >
                            <Trash2 size={16} />
                          </Button>
                          <DropdownMenu modal={false} >
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
                                  onClick={() => handleChangeSupervisorStatus(supervisor)}
                                  disabled={!supervisor.user || statusMutation.isPending}
                                >
                                  {supervisor.user?.active ? (
                                    <><XCircle size={16} className="mr-2 text-red-500" /> Set Inactive</>
                                  ) : (
                                    <><CheckCircle size={16} className="mr-2 text-green-500" /> Set Active</>
                                  )}
                                </DropdownMenuItem>
                                {supervisor.user && (
                                  <DropdownMenuItem onClick={() => openChangePasswordDialog(supervisor.user!.id)}>
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
                <h3 className="text-lg font-semibold">No Supervisors found</h3>
              </div>
              <p className="mb-6 text-muted-foreground max-w-sm">
                {search
                  ? "Try a different search term or clear filters"
                  : "Get started by adding your first Supervisor"}
              </p>
              <Button
                onClick={() => navigate("/admin/supervisors/create")}
                className="bg-green-600 hover:bg-primary text-white"
              >
                <PlusCircle size={16} className="mr-2" />
                Add Supervisor
              </Button>
            </div>
          ) : (
            <div className="flex justify-center items-center py-24">
              <Loader size={30} className="animate-spin" />
            </div>
          )}

          {supervisors.length > 0 && (
            <div className="mt-4 flex flex-col sm:flex-row justify-between items-center">
              <div className="mb-4 sm:mb-0 text-sm text-muted-foreground">
                Showing {supervisors.length > 0 ? (currentPage - 1) * recordsPerPage + 1 : 0} to{" "}
                {Math.min(currentPage * recordsPerPage, totalSupervisors)} of {totalSupervisors} records
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
      {selectedSupervisorUserId && (
        <ChangePasswordDialog
          isOpen={showChangePasswordDialog}
          userId={selectedSupervisorUserId}
          onClose={closeChangePasswordDialog}
        />
      )}

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        isOpen={showConfirmDeleteDialog}
        title="Delete Supervisor"
        description="Are you sure you want to delete this supervisor? This action cannot be undone."
        onCancel={() => {
          setShowConfirmDeleteDialog(false);
          setSupervisorToDeleteId(null);
        }}
        onConfirm={handleDeleteSupervisor}
        confirmLabel="Delete Supervisor"
      />
    </div>
  );
};

export default SupervisorList;