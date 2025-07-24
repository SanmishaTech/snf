import { useState, useEffect, useRef, useCallback } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { get, del } from "@/services/apiService";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Breadcrumb, BreadcrumbItem } from "@/components/ui/breadcrumb";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  HomeIcon,
  Calendar as CalendarIcon,
  Filter,
  ShoppingCart,
  Edit,
  MoreHorizontal,
  Eye,
  Trash2,
  ClipboardCheck,
  AlertCircle,
} from "lucide-react";
import { formatCurrency } from "@/lib/formatter"
import { toast } from "sonner";
import { Pagination, PaginationContent, PaginationPrevious, PaginationNext } from "@/components/ui/pagination";
import { cn } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface OrderItem {
  id: string;
  productId: string;
  productName: string;
  price: number;
  quantity: number;
  deliveredQuantity?: number;
  receivedQuantity?: number;
  supervisorQuantity?: number;
  unit?: string; // Added unit field
  depotVariantId?: string;
  depotVariantName?: string; // Added depot variant name field
  agency?: {
    id: number;
    name: string;
    user?: {
      id: number;
      name: string;
      email?: string;
      mobile?: string;
    };
  };
  depot?: {
    id: number;
    name: string;
    address?: string;
    contactPerson?: string;
    contactNumber?: string;
  };
}

interface Order {
  id: string;
  poNumber: string;
  orderDate: string;
  deliveryDate: string;
  contactPersonName: string;
  vendor: {
    id: string;
    name: string;
  };
  status: "PENDING" | "DELIVERED" | "RECEIVED";
  items: OrderItem[];
  totalAmount: number;
  recordedByAgencies?: string[];
}

interface StoredUserDetails {
  role: string | null;
  id: string | null;
}

const getStoredUserDetails = (): StoredUserDetails => {
  const storedUser = localStorage.getItem("user");
  if (storedUser) {
    try {
      const user = JSON.parse(storedUser);
      return {
        role: user?.role || null,
        id: user?.id || null,
      };
    } catch (error) {
      console.error("Failed to parse user from localStorage", error);
      return { role: null, id: null };
    }
  }
  return { role: null, id: null };
};

const OrderList = () => {
  const [page, setPage] = useState(1);
  const [inputValue, setInputValue] = useState(""); // For the input field
  const [searchTerm, setSearchTerm] = useState(""); // Debounced value for the query
  const [dateFilter, setDateFilter] = useState<Date | undefined>(undefined);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const searchDebounceTimeout = useRef<number | null>(null);
  const pageSize = 10;

  const [currentUserDetails, setCurrentUserDetails] = useState<StoredUserDetails>(getStoredUserDetails());
  const [currentAgencyId, setCurrentAgencyId] = useState<string | null>(null);
  const [isAgencyInfoLoading, setIsAgencyInfoLoading] = useState<boolean>(false);
  const [currentSupervisorAgencyId, setCurrentSupervisorAgencyId] = useState<string | null>(null);
  const [isSupervisorInfoLoading, setIsSupervisorInfoLoading] = useState<boolean>(false);

  const currentUserRole = currentUserDetails?.role;

  const handleInputChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(event.target.value);
  }, []); // setInputValue from useState is stable, so empty dependency array is fine

  useEffect(() => {
    const fetchUserInfo = async () => {
      const token = localStorage.getItem("authToken");
      if (!token) {
        console.error("No auth token found for user");
        return;
      }

      if (currentUserRole === 'AGENCY') {
        setIsAgencyInfoLoading(true);
        try {
          const agencyInfo = await get("/users/me");
          console.log("agencyinfo",agencyInfo)
          // Ensure agencyId is stored as a string if it exists, otherwise null
          setCurrentAgencyId(agencyInfo?.agencyId ? String(agencyInfo.agencyId) : null);
        } catch (error) {
          console.error("Failed to fetch agency info:", error);
          toast.error("Could not load agency details.");
          setCurrentAgencyId(null);
        }
        setIsAgencyInfoLoading(false);
      } else if (currentUserRole === 'SUPERVISOR') {
        setIsSupervisorInfoLoading(true);
        try {
          const supervisorInfo = await get("/users/me");
          console.log("supervisorinfo", supervisorInfo);
          // Get the agency ID from supervisor's assigned agency
          setCurrentSupervisorAgencyId(supervisorInfo?.supervisor?.agencyId ? String(supervisorInfo.supervisor.agencyId) : null);
        } catch (error) {
          console.error("Failed to fetch supervisor info:", error);
          toast.error("Could not load supervisor details.");
          setCurrentSupervisorAgencyId(null);
        }
        setIsSupervisorInfoLoading(false);
      }
    };
    fetchUserInfo();
  }, [currentUserRole]);

  useEffect(() => {
    if (currentUserRole === 'AGENCY' && statusFilter === 'PENDING') {
      setStatusFilter(""); // Clear status filter if it's PENDING for an agency
    }
  }, [currentUserRole, statusFilter]);

  // Debounce search input to prevent losing focus
  useEffect(() => {
    // Clear existing timeout when input changes
    if (searchDebounceTimeout.current) {
      window.clearTimeout(searchDebounceTimeout.current);
    }
    
    // Set a new timeout to update searchTerm after 500ms of no typing
    searchDebounceTimeout.current = window.setTimeout(() => {
      setSearchTerm(inputValue);
    }, 500);
    
    // Cleanup function to clear timeout on unmount
    return () => {
      if (searchDebounceTimeout.current) {
        window.clearTimeout(searchDebounceTimeout.current);
      }
    };
  }, [inputValue]);

  const ordersQueryEnabled = 
    !!currentUserRole && 
    (currentUserRole !== 'AGENCY' || (currentUserRole === 'AGENCY' && !isAgencyInfoLoading && currentAgencyId !== undefined)) &&
    (currentUserRole !== 'SUPERVISOR' || (currentUserRole === 'SUPERVISOR' && !isSupervisorInfoLoading));


  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["orders", page, searchTerm, dateFilter, statusFilter, currentUserRole, currentAgencyId, currentSupervisorAgencyId],
    queryFn: async () => {
      if (!currentUserRole) return { data: [], totalPages: 0 };
      if (currentUserRole === 'AGENCY' && !currentAgencyId) {
        return { data: [], totalPages: 0 };
      }
      if (currentUserRole === 'SUPERVISOR' && !currentSupervisorAgencyId) {
        return { data: [], totalPages: 0 };
      }

      let baseUrl = '/vendor-orders'; 
      if (currentUserRole === 'VENDOR') {
        baseUrl = '/vendor-orders/my';
      } else if (currentUserRole === 'AGENCY') {
        baseUrl = '/vendor-orders/my-agency-orders'; 
      } else if (currentUserRole === 'SUPERVISOR') {
        baseUrl = '/vendor-orders/my-supervisor-orders';
      }
      let url = `${baseUrl}?page=${page}&limit=${pageSize}`;
      
      if (searchTerm) {
        url += `&search=${searchTerm}`;
      }
      
      if (dateFilter) {
        url += `&date=${format(dateFilter, "yyyy-MM-dd")}`;
      }
      
      if (statusFilter) {
        url += `&status=${statusFilter}`;
      }
      
      if (currentUserRole === 'AGENCY') {
        // Always exclude PENDING orders for AGENCY users
        url += `&excludeStatus=PENDING`;
        // Add agencyId if the user is an agency and agencyId is available
        if (currentAgencyId) {
          url += `&agencyId=${currentAgencyId}`;
        }
      }
      
      const response = await get(url);
      return response;
    },
    enabled: ordersQueryEnabled,
  });
   const orders: Order[] = data?.data || [];
  const totalPages = data?.totalPages || 1;

  const handleDeleteOrder = async (orderId: string) => {
    try {
      await del(`/vendor-orders/${orderId}`);
      toast.success("Order deleted successfully");
      refetch(); 
    } catch (error) {
      toast.error("Failed to delete order");
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "PENDING":
        return "bg-yellow-500";
      case "DELIVERED":
        return "bg-secondary";
      case "RECEIVED":
        return "bg-primary";
      default:
        return "bg-gray-500";
    }
  };

  const getOrderQuantitiesSummary = (items: OrderItem[]) => {
    if (!items || items.length === 0) {
      return { ordered: 0, delivered: 0, received: 0, supervisor: 0 };
    }
    const ordered = items.reduce((sum, item) => sum + (item.quantity || 0), 0);
    const delivered = items.reduce((sum, item) => sum + (item.deliveredQuantity || 0), 0);
    const received = items.reduce((sum, item) => sum + (item.receivedQuantity || 0), 0);
    const supervisor = items.reduce((sum, item) => sum + (item.supervisorQuantity || 0), 0);
    return { ordered, delivered, received, supervisor };
  };

  const clearFilters = () => {
    setInputValue(""); // Clear the input field
    setSearchTerm(""); // Clear the search term
    setDateFilter(undefined);
    setStatusFilter("");
    setPage(1); 
  };

  if (currentUserRole === 'AGENCY' && isAgencyInfoLoading) {
    return <div className="flex justify-center items-center h-screen"><p>Loading agency details...</p></div>;
  }

  if (currentUserRole === 'SUPERVISOR' && isSupervisorInfoLoading) {
    return <div className="flex justify-center items-center h-screen"><p>Loading supervisor details...</p></div>;
  }

  if (isLoading && ordersQueryEnabled) { 
    return <div className="flex justify-center items-center h-screen"><p>Loading orders...</p></div>;
  }

  if (isError && ordersQueryEnabled) { 
    return <div className="flex justify-center items-center h-screen"><p>Error loading orders. Please try again later.</p></div>;
  }

  return (
    <div className="container mx-auto p-6 bg-gray-50 dark:bg-gray-900 min-h-screen">
       

      <Card className="mb-6 shadow-lg dark:bg-gray-800">
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <CardTitle className="text-2xl font-bold text-gray-800 dark:text-gray-100">Order Management</CardTitle>
          {currentUserRole === "ADMIN" && (
            <Link to="/admin/orders/create">
              <Button className="bg-blue-600 hover:bg-blue-700 text-white dark:bg-secondary dark:hover:bg-blue-600">
                <ShoppingCart className="mr-2 h-5 w-5" /> Create New Order
              </Button>
            </Link>
          )}
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6 min-w-full ">
            <Input
              placeholder="Search by PO, Vendor..."
              value={inputValue}
              onChange={handleInputChange} // Use the memoized handler
              className="dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600 w-full"
            />
            {/* <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
                  className={cn(
                    "w-full justify-start text-left font-normal dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600",
                    !dateFilter && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateFilter ? format(dateFilter, "dd/MM/yyyy") : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 dark:bg-gray-800" align="start">
                <Calendar
                  mode="single"
                  selected={dateFilter}
                  onSelect={setDateFilter}
                  initialFocus
                  className="dark:text-gray-200"
                />
              </PopoverContent>
            </Popover> */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full p-2 border rounded-md dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600"
            >
              <option value="">All Status</option>
              {currentUserRole !== 'AGENCY' && (
                <option value="PENDING">Pending</option>
              )}
              <option value="DELIVERED">Delivered</option>
              <option value="RECEIVED">Received</option>
            </select>
            <Button onClick={clearFilters} variant="outline" className="dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-600">
              <Filter className="mr-2 h-4 w-4" /> Clear Filters
            </Button>
          </div>

          {orders.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-xl text-gray-600 dark:text-gray-400">No orders found.</p>
              <p className="text-sm text-gray-500 dark:text-gray-500">Try adjusting your filters or creating a new order.</p>
            </div>
          ) : (
            <Table className="min-w-full bg-white dark:bg-gray-800 shadow-md rounded-lg overflow-hidden">
              <TableHeader className="bg-gray-100 dark:bg-gray-700">
                <TableRow>
                  <TableHead className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-300">PO Number</TableHead>
                  <TableHead className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-300">Farmer</TableHead>
                  <TableHead className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-300">Agency/Depot</TableHead>
                  <TableHead className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-300">Order Date</TableHead>
                  <TableHead className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-300">Delivery Date</TableHead>
                  <TableHead className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-300">Total Amount</TableHead>
                  {currentUserRole === "ADMIN" && (
                    <TableHead className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-300">Quantities (O/D/R/S)</TableHead>
                  )}
                  <TableHead className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-300">Status</TableHead>
                  <TableHead className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-300">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-gray-200 dark:divide-gray-700">
                {orders.map((order) => {
                  const agencyNeedsToRecord = currentUserRole === "AGENCY" && 
                                            !!currentAgencyId && 
                                            order.status === "RECEIVED" && 
                                            !order.recordedByAgencies?.includes(currentAgencyId);
                  const canAgencyRecord = currentUserRole === "AGENCY" && 
                                        !!currentAgencyId && 
                                        (order.status === "DELIVERED" || agencyNeedsToRecord);
                  const quantities = getOrderQuantitiesSummary(order.items);
                  
                  return (
                  <TableRow key={order.id} className="hover:bg-gray-50 dark:hover:bg-gray-750">
                    <TableCell className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">{order.poNumber}</TableCell>
                    <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{order.vendor.name}</TableCell>
                    <TableCell className="px-6 py-4 text-sm text-gray-500 dark:text-gray-300">
                      {(() => {
                        // Get unique agencies and depots from order items
                        const agencies = order.items?.map(item => item.agency).filter(Boolean) || [];
                        const depots = order.items?.map(item => item.depot).filter(Boolean) || [];
                        const uniqueAgencies = agencies.filter((agency, index, self) => 
                          agency && self.findIndex(a => a?.id === agency.id) === index
                        );
                        const uniqueDepots = depots.filter((depot, index, self) => 
                          depot && self.findIndex(d => d?.id === depot.id) === index
                        );
                        
                        return (
                          <div className="space-y-1">
                            {uniqueAgencies.map(agency => agency && (
                              <div key={`agency-${agency.id}`} className="text-xs">
                                <div className="font-medium text-blue-600">{agency.name}</div>
                                {agency.user && (
                                  <div className="text-gray-400">
                                    {agency.user.name} • {agency.user.mobile}
                                  </div>
                                )}
                              </div>
                            ))}
                            {uniqueDepots.map(depot => depot && (
                              <div key={`depot-${depot.id}`} className="text-xs">
                                <div className="font-medium text-green-600">{depot.name}</div>
                                {depot.address && (
                                  <div className="text-gray-400 truncate max-w-xs">{depot.address}</div>
                                )}
                              </div>
                            ))}
                            {uniqueAgencies.length === 0 && uniqueDepots.length === 0 && (
                              <span className="text-gray-400">N/A</span>
                            )}
                          </div>
                        );
                      })()}
                    </TableCell>
                    <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{format(new Date(order.orderDate), "dd/MM/yyyy")}</TableCell>
                    <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{format(new Date(order.deliveryDate), "dd/MM/yyyy")}</TableCell>
                    <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{formatCurrency(order.totalAmount)}</TableCell>
                    {currentUserRole === "ADMIN" && (
                      <TableCell className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className="flex flex-col space-y-1">
                          {(() => {
                            // Get all unique variant names from items
                            const variantNames = order.items
                              .map(item => item.depotVariantName)
                              .filter((name, index, self) => name && self.indexOf(name) === index);
                            const variantDisplay = variantNames.length > 0 ? ` (${variantNames.join(', ')})` : "";
                            console.log(order.items)
                            return (
                              <>
                                <div><span className="font-medium">Ordered:</span> {quantities.ordered}{variantDisplay}</div>
                                <div>
                                  <span className="font-medium">Delivered:</span>{" "}
                                  <span className={quantities.delivered < quantities.ordered ? "text-red-500 font-medium" : "text-gray-500 dark:text-gray-300"}>
                                    {quantities.delivered}
                                  </span>
                                </div>
                                <div>
                                  <span className="font-medium">Received:</span>{" "}
                                  <span className={quantities.received < quantities.delivered ? "text-red-500 font-medium" : "text-gray-500 dark:text-gray-300"}>
                                    {quantities.received}
                                  </span>
                                </div>
                                <div>
                                  <span className="font-medium">Supervisor:</span>{" "}
                                  <span className={quantities.supervisor < quantities.received ? "text-red-500 font-medium" : "text-gray-500 dark:text-gray-300"}>
                                    {quantities.supervisor}
                                  </span>
                                </div>
                              </>
                            );
                          })()}
                        </div>
                      </TableCell>
                    )}
                    <TableCell className="px-6 py-4 whitespace-nowrap">
                      <Badge className={`${getStatusColor(order.status)} text-white px-2 py-1 rounded-full text-xs`}>
                        {order.status}
                      </Badge>
                      {agencyNeedsToRecord && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <AlertCircle className="ml-2 h-4 w-4 text-red-500 inline-block" />
                            </TooltipTrigger>
                            <TooltipContent className="bg-black text-white p-2 rounded">
                              <p>You need to record your quantities for this order.</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                    </TableCell>
                    <TableCell className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <DropdownMenu modal={false} >
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="dark:bg-gray-800 dark:text-gray-200">
                          {currentUserRole === "ADMIN" && (
                            <>
                              {/* {order.status === "PENDING" && (
                                <DropdownMenuItem asChild>
                                  <Link to={`/admin/orders/${order.id}/edit`} className="flex items-center w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800">
                                    <Edit className="mr-2 h-4 w-4" /> Edit
                                  </Link>
                                </DropdownMenuItem>
                              )} */}
                              <DropdownMenuItem asChild>
                                <Link to={`/admin/orders/${order.id}`} className="flex items-center w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800">
                                  <Eye className="mr-2 h-4 w-4" /> View Details
                                </Link>
                              </DropdownMenuItem>
                              {order.status === "PENDING" && (
                                <DropdownMenuItem onClick={() => handleDeleteOrder(order.id)} className="flex items-center w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/50 cursor-pointer">
                                  <Trash2 className="mr-2 h-4 w-4" /> Delete
                                </DropdownMenuItem>
                              )}
                            </>
                          )}

                          {currentUserRole === "VENDOR" && (
                            <>
                              {(order.status === "PENDING" || order.status === "DELIVERED") && (
                                <DropdownMenuItem asChild>
                                  <Link to={`/vendor/orders/${order.id}/record-delivery`} className="flex items-center w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800">
                                    <ClipboardCheck className="mr-2 h-4 w-4" /> Record Delivery
                                  </Link>
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem asChild>
                                <Link to={`/vendor/orders/${order.id}`} className="flex items-center w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800">
                                  <Eye className="mr-2 h-4 w-4" /> View Details
                                </Link>
                              </DropdownMenuItem>
                            </>
                          )}

                          {currentUserRole === "AGENCY" && (
                            <>
                              <DropdownMenuItem asChild>
                                <Link to={`/admin/orders/${order.id}`} className="flex items-center w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800">
                                  <Eye className="mr-2 h-4 w-4" /> View Details
                                </Link>
                              </DropdownMenuItem>
                              {canAgencyRecord && (
                                <DropdownMenuItem asChild>
                                  <Link to={`/admin/orders/${order.id}/record-receipt`} className="flex items-center w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800">
                                    <ClipboardCheck className="mr-2 h-4 w-4" /> 
                                    {agencyNeedsToRecord ? "Record Your Quantities" : "Record Receipt"}
                                  </Link>
                                </DropdownMenuItem>
                              )}
                            </>
                          )}

                          {currentUserRole === "SUPERVISOR" && (
                            <>
                              <DropdownMenuItem asChild>
                                <Link to={`/admin/orders/${order.id}`} className="flex items-center w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800">
                                  <Eye className="mr-2 h-4 w-4" /> View Details
                                </Link>
                              </DropdownMenuItem>
                              {(order.status === "DELIVERED" || order.status === "RECEIVED") && (
                                <DropdownMenuItem asChild>
                                  <Link to={`/admin/orders/${order.id}/supervisor-quantity`} className="flex items-center w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800">
                                    <ClipboardCheck className="mr-2 h-4 w-4" /> Record Supervisor Quantity
                                  </Link>
                                </DropdownMenuItem>
                              )}
                            </>
                          )}

                          {currentUserRole !== "ADMIN" && currentUserRole !== "VENDOR" && currentUserRole !== "AGENCY" && currentUserRole !== "SUPERVISOR" && (
                             <DropdownMenuItem disabled className="flex items-center w-full px-3 py-2 text-sm text-gray-700 dark:text-gray-200">
                              No actions available for your role.
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                )})}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {!isLoading && !isError && orders.length > 0 && (
        <div className="flex justify-center mt-6">
          <Pagination>
            <PaginationPrevious
              onClick={() => page > 1 && setPage(page - 1)}
              className={cn("cursor-pointer", page <= 1 && "pointer-events-none opacity-50")}
            />
            <PaginationContent>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Page {page} of {totalPages}
                </span>
              </div>
            </PaginationContent>
            <PaginationNext
              onClick={() => page < totalPages && setPage(page + 1)}
              className={cn("cursor-pointer", page >= totalPages && "pointer-events-none opacity-50")}
            />
          </Pagination>
        </div>
      )}
    </div>
  );
};

export default OrderList;
