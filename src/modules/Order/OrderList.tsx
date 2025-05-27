import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { get, del } from "@/services/apiService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink } from "@/components/ui/breadcrumb";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import {
  HomeIcon,
  Search,
  Calendar as CalendarIcon,
  Filter,
  ShoppingCart,
  Edit,
  MoreHorizontal,
  Eye,
  Trash2,
  ClipboardCheck,
} from "lucide-react";
import { formatCurrency } from "@/lib/formatter"
import { toast } from "sonner";
import { Pagination, PaginationContent, PaginationPrevious, PaginationNext } from "@/components/ui/pagination";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";
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

interface OrderItem {
  id: string;
  productId: string;
  productName: string;
  price: number;
  quantity: number;
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
}

 
interface UserDetails {
  role: string | null;
  id: string | null; // Assuming user object in localStorage has an 'id'
}

const getUserDetailsFromLocalStorage = (): UserDetails => {
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
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFilter, setDateFilter] = useState<Date | undefined>(undefined);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const pageSize = 10;

  const { role: currentUserRole, id: currentUserId } = getUserDetailsFromLocalStorage();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["orders", page, searchTerm, dateFilter, statusFilter, currentUserRole, currentUserId],
    queryFn: async () => {
      let baseUrl = '/vendor-orders'; // Default for ADMIN or other unhandled roles
      if (currentUserRole === 'VENDOR') {
        baseUrl = '/vendor-orders/my';
      } else if (currentUserRole === 'AGENCY') {
        baseUrl = '/vendor-orders/my-agency-orders'; // New endpoint for agency's orders
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
      
      const response = await get(url);
      return response;
    },
  });
  console.log(data)
  const orders = data?.data || [];
  const totalPages = data?.totalPages || 1;

  const handleDeleteOrder = async (orderId: string) => {
    // Optional: Add a confirmation dialog here
    // if (!confirm("Are you sure you want to delete this order?")) {
    //   return;
    // }
    try {
      await del(`/vendor-orders/${orderId}`);
      toast.success("Order deleted successfully");
      refetch(); // Refetch orders after deletion
    } catch (error) {
      toast.error("Failed to delete order");
      console.error("Delete order error:", error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "PENDING":
        return "bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-800";
      case "DELIVERED":
        return "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800";
      case "RECEIVED":
        return "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-900 dark:text-gray-300 dark:border-gray-800";
    }
  };

  const clearFilters = () => {
    setSearchTerm("");
    setDateFilter(undefined);
    setStatusFilter("");
  };

  return (
    <div className="container mx-auto py-6 space-y-6 items-center">
      <div className="max-w-7xl mx-auto w-full flex flex-col sm:flex-row sm:items-center justify-between items-center gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Orders</h1>
          <div className="flex items-center gap-2">
           
          </div>
         
        </div>
     {  currentUserRole === "ADMIN" &&  <Button asChild className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700">
          <Link to="/admin/orders/create">
            <ShoppingCart className="h-4 w-4 mr-2" />
            Create New Order
          </Link>
        </Button>}
      </div>

      {/* Filters */} 
      <Card className="max-w-7xl mx-auto overflow-hidden border-0 shadow-sm bg-gradient-to-r from-slate-50 to-gray-50 dark:from-slate-950 dark:to-gray-950">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                 value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800"
              />
            </div>
            
            <div className="flex gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="flex gap-2 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800">
                    <CalendarIcon className="h-4 w-4" />
                    {dateFilter ? format(dateFilter, "dd/mm/yy") : "Filter by date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dateFilter}
                    onSelect={setDateFilter}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="rounded-md border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-3 py-2 text-sm flex-shrink-0 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Statuses</option>
                <option value="PENDING">Pending</option>
                <option value="DELIVERED">DELIVERED</option>
                <option value="RECEIVED">Delivered</option>
              </select>
              
              {(searchTerm || dateFilter || statusFilter) && (
                <Button variant="ghost" onClick={clearFilters} className="flex-shrink-0">
                  Clear
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500" />
        </div>
      ) : isError ? (
        <Card className="max-w-7xl mx-auto bg-red-50 dark:bg-red-950 border-red-100 dark:border-red-900">
          <CardContent className="p-6 text-center">
            <p className="text-red-600 dark:text-red-400">Failed to load orders. Please try again.</p>
            <Button variant="outline" onClick={() => refetch()} className="mt-4">
              Retry
            </Button>
          </CardContent>
        </Card>
      ) : orders.length === 0 ? (
        <Card className="max-w-7xl mx-auto bg-white dark:bg-gray-900 shadow-sm border border-gray-200 dark:border-gray-800">
          <CardContent className="p-10 text-center">
            <ShoppingCart className="h-12 w-12 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">No orders found</h3>
            <p className="text-gray-500 dark:text-gray-400 mt-2">
              {searchTerm || dateFilter || statusFilter
                ? "Try adjusting your search filters."
                : "There are no orders to display at the moment."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card className="max-w-7xl mx-auto bg-white dark:bg-gray-900 shadow-md border border-gray-200 dark:border-gray-800">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="border-b border-gray-200 dark:border-gray-800">
                  <TableHead className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">PO Number</TableHead>
                  <TableHead className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Vendor</TableHead>
                  <TableHead className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Order Date</TableHead>
                  <TableHead className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Delivery Date</TableHead>
                  <TableHead className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</TableHead>
                  <TableHead className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Quantity</TableHead>
                  <TableHead className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Total Amount</TableHead>
                  <TableHead className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-gray-200 dark:divide-gray-800">
                {orders.map((order: Order) => (
                  <TableRow key={order.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                    <TableCell className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">{order.poNumber}</TableCell>
                    <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{order.vendor?.name || (currentUserRole === 'VENDOR' ? 'You' : '—')}</TableCell>
                     <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{format(new Date(order.orderDate), "dd/MM/yyyy")}</TableCell>
                    <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{format(new Date(order.deliveryDate), "dd/MM/yyyy")}</TableCell>
                    <TableCell className="px-6 py-4 whitespace-nowrap text-sm">
                      <Badge className={cn("text-xs font-semibold px-2 py-0.5 rounded-full", getStatusColor(order.status))}>
                        {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                      </Badge>
                    </TableCell>
                    <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-center text-gray-500 dark:text-gray-400">
                      {order.items.reduce((acc, item) => acc + item.quantity, 0)}
                    </TableCell>
                    <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-700 dark:text-gray-300">{formatCurrency(order.totalAmount.toFixed(2))}</TableCell>
                    <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-center">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
                            <MoreHorizontal className="h-5 w-5" />
                            <span className="sr-only">Actions</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          {currentUserRole === "ADMIN" && (
                            <>
                              <DropdownMenuItem asChild>
                                <Link to={`/admin/orders/${order.id}`} className="flex items-center w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800">
                                  <Eye className="mr-2 h-4 w-4" /> View Details
                                </Link>
                              </DropdownMenuItem>
                              {order.status === "PENDING" && (
                                <>
                                  <DropdownMenuItem asChild>
                                    <Link to={`/admin/orders/edit/${order.id}`} className="flex items-center w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800">
                                      <Edit className="mr-2 h-4 w-4" /> Edit Order
                                    </Link>
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => handleDeleteOrder(order.id)}
                                    className="flex items-center w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/30 cursor-pointer"
                                  >
                                    <Trash2 className="mr-2 h-4 w-4" /> Delete Order
                                  </DropdownMenuItem>
                                </> 
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
                              {/* Always show View Details for VENDOR role */}
                              <DropdownMenuItem asChild>
                                <Link to={`/vendor/orders/${order.id}`} className="flex items-center w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800">
                                  <Eye className="mr-2 h-4 w-4" /> View Details
                                </Link>
                              </DropdownMenuItem>
                            </>
                          )}

                          {currentUserRole === "AGENCY" && (
                            <DropdownMenuItem asChild>
                              <Link to={`/admin/orders/${order.id}`} className="flex items-center w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800">
                                <Eye className="mr-2 h-4 w-4" /> View Details
                              </Link>
                            </DropdownMenuItem>
                          )}

                          {currentUserRole !== "ADMIN" && currentUserRole !== "VENDOR" && currentUserRole !== "AGENCY" && (
                             <DropdownMenuItem disabled className="flex items-center w-full px-3 py-2 text-sm text-gray-700 dark:text-gray-200">
                              No actions available for your role.
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Pagination */}
      {!isLoading && !isError && orders.length > 0 && (
        <div className="flex justify-center mt-6">
          <Pagination>
            <PaginationPrevious
              onClick={page > 1 ? () => setPage(page - 1) : (e) => e.preventDefault()}
              className={page <= 1 ? "pointer-events-none opacity-50" : ""}
            />
            <PaginationContent>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Page {page} of {totalPages}
                </span>
              </div>
            </PaginationContent>
            <PaginationNext
              onClick={page < totalPages ? () => setPage(page + 1) : (e) => e.preventDefault()}
              className={page >= totalPages ? "pointer-events-none opacity-50" : ""}
            />
          </Pagination>
        </div>
      )}
    </div>
  );
};

export default OrderList;
