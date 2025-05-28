import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { get } from "@/services/apiService";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink } from "@/components/ui/breadcrumb";
import { Badge } from "@/components/ui/badge";

import { format } from "date-fns";
import {
  HomeIcon,
  ArrowLeft,
  Truck,
  Package,
  ShoppingCart,
  FileText,
  Check,
  Clock,
  ClipboardCheck,
  PackageCheck
} from "lucide-react";
import { cn } from "@/lib/utils";

const getRoleFromLocalStorage = () => {
  const storedUser = localStorage.getItem("user");
  if (storedUser) {
    try {
      const user = JSON.parse(storedUser);
      return user?.role || null;
    } catch (error) {
      console.error("Failed to parse user from localStorage", error);
      return null;
    }
  }
  return null;
};

interface OrderItem {
  id: string;
  productId: string;
  productName: string;
  priceAtPurchase: number; // Corrected field name based on API
  quantity: number;
  deliveredQuantity?: number; // Already present in Order.items, good to have here too for consistency
  receivedQuantity?: number; // Add receivedQuantity
  agencyId?: string; // Optional if not always present
  agencyName?: string; // Optional if not always present
  unit?: string; // Optional unit for the product
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
    email: string;
    mobile: string;
    address: string;
  };
  status: "PENDING" | "DELIVERED" | "RECEIVED";
  items: (OrderItem & { deliveredQuantity?: number })[];
  createdAt: string;
  updatedAt: string;
}

const OrderDetailsPage = () => {
  const { id } = useParams<{ id: string }>();
  const [activeTab, setActiveTab] = useState<"details" | "timeline">("details");
  const currentUserRole = getRoleFromLocalStorage();

  const { data: order, isLoading, isError, refetch } = useQuery<Order>({
    queryKey: ["order", id],
    queryFn: async (): Promise<Order> => {
      const response = await get(`/vendor-orders/${id}`);
      // Transform the items array to match the OrderItem interface
      const transformedItems = response.items.map((item: any) => ({
        id: String(item.id),
        productId: String(item.productId),
        productName: item.product?.name || 'Unknown Product',
        priceAtPurchase: Number(item.priceAtPurchase || 0),
        deliveredQuantity: item.deliveredQuantity !== null && item.deliveredQuantity !== undefined ? Number(item.deliveredQuantity) : undefined,
        receivedQuantity: item.receivedQuantity !== null && item.receivedQuantity !== undefined ? Number(item.receivedQuantity) : undefined, // Map receivedQuantity
        quantity: Number(item.quantity || 0),
        agencyId: item.agency?.id ? String(item.agency.id) : undefined,
        agencyName: item.agency?.name || undefined,
        unit: item.product?.unit || undefined,
      }));
      return { ...response, items: transformedItems } as Order;
    },
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "PENDING":
        return "bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-800";
      case "DELIVERED":
        return "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800";
      case "RECEIVED":
        return "bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-900 dark:text-gray-300 dark:border-gray-800";
    }
  };

  const getDisplayStatusText = (status: Order['status']): string => {
    switch (status) {
      case "PENDING": return "Pending";
      case "DELIVERED": return "Delivered";
      case "RECEIVED": return "Received";
      default:
        const knownStatus = status as string; // Type assertion for string operations
        return knownStatus ? knownStatus.charAt(0).toUpperCase() + knownStatus.slice(1) : "Unknown Status";
    }
  };

  const getStatusDescriptionText = (status: Order['status']): string => {
    switch (status) {
      case "PENDING": return "Order has been created and is awaiting vendor action.";
      case "DELIVERED": return "Order has been marked as delivered by the vendor.";
      case "RECEIVED": return "Order has been received and verified.";
      default:
        return `Order status is currently ${status || 'unknown'}.`;
    }
  };

  if (isError) {
    return (
      <div className="container mx-auto py-10">
        <p className="text-center text-red-500">Error loading order details.</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="container mx-auto py-10">
        <p className="text-center text-gray-500">Order data not available.</p>
      </div>
    ); 
  }

  if (isLoading) {
    return (
      <div className="container mx-auto py-10">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6 px-4 sm:px-6 lg:px-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-3">
            {/* <Button variant="ghost" size="icon" asChild className="h-8 w-8">
              <Link to="/orders">
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button> */}
            <h1 className="text-3xl font-bold tracking-tight">Order #{order.poNumber}</h1>
            {/* <Badge 
              className={cn(
                "ml-2 font-medium border uppercase text-xs px-2.5 py-0.5",
                getStatusColor(order.status)
              )}
            >
              {order.status}
            </Badge> */}
          </div>
          {/* <Breadcrumb className="mt-2 ml-11">
            <BreadcrumbItem>
              <BreadcrumbLink href="/dashboard">
                <HomeIcon className="h-4 w-4 mr-1" />
                Dashboard
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbItem>
              <BreadcrumbLink href="/orders">Orders</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbItem>
              <span className="text-gray-500 dark:text-gray-400">#{order.poNumber}</span>
            </BreadcrumbItem>
          </Breadcrumb> */}
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex border-b border-gray-200 dark:border-gray-800">
        <button
          className={cn(
            "px-4 py-2 font-medium text-sm flex items-center gap-2",
            activeTab === "details"
              ? "border-b-2 border-blue-500 text-blue-600 dark:text-blue-400"
              : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
          )}
          onClick={() => setActiveTab("details")}
        >
          <FileText className="h-4 w-4" />
          Order Details
        </button>
        {currentUserRole !== "VENDOR" && (
          <button
            className={cn(
              "px-4 py-3 font-medium text-sm focus:outline-none",
              activeTab === "timeline"
                ? "border-b-2 border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400"
                : "text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
            )}
            onClick={() => setActiveTab("timeline")}
          >
            Order Timeline
          </button>
        )}
      </div>

      {activeTab === "details" ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Order Details */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-xl flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5 text-blue-500" />
                  Order Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Order Number</h3>
                    <p className="mt-1 text-lg font-semibold">{order.poNumber}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Status</h3>
                    <p className="mt-1">
                      <Badge 
                        className={cn(
                          "font-medium border text-xs px-2.5 py-0.5",
                          getStatusColor(order.status)
                        )}
                      >
                        {getDisplayStatusText(order.status)}
                      </Badge>
                    </p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Order Date</h3>
                    <p className="mt-1 text-gray-900 dark:text-gray-100">
                      {format(new Date(order.orderDate), "dd/MM/yy")}
                    </p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Delivery Date</h3>
                    <p className="mt-1 text-gray-900 dark:text-gray-100">
                      {format(new Date(order.deliveryDate), "dd/MM/yy")}
                    </p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Contact Person</h3>
                    <p className="mt-1 text-gray-900 dark:text-gray-100">{order.contactPersonName}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Order Items */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-xl flex items-center gap-2">
                  <Package className="h-5 w-5 text-blue-500" />
                  Order Items
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-800">
                  <div className="bg-gray-50 dark:bg-gray-900 px-4 py-3 text-sm font-medium text-gray-500 dark:text-gray-400 grid grid-cols-12">
                    <div className="col-span-6">Product</div> {/* Adjusted from col-span-8 to col-span-6 */}
                    <div className="col-span-2 text-right">Ordered</div>
                    <div className="col-span-2 text-right">Delivered</div>
                    <div className="col-span-2 text-right">Received</div> {/* New column */}
                  </div>
                  <div className="divide-y divide-gray-200 dark:divide-gray-800 mb-2">
                    {order.items.map((item) => (
                      <div key={item.id} className="mb-2 px-4 py-4 grid grid-cols-12 items-center">
                        <div className="col-span-6"> {/* Adjusted from col-span-8 to col-span-6 */}
                          <div className="flex items-center">
                            <div className="h-10 w-10 flex-shrink-0 rounded-md bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                              <Package className="h-5 w-5 text-gray-500" />
                            </div>
                            <div className="ml-4">
                              <p className="font-medium text-gray-900 dark:text-gray-100">{item.productName}</p>
                              {/* <p className="text-xs text-gray-500 dark:text-gray-400">ID: {item.productId}</p> */}
                              {item.agencyName && <p className="text-xs text-blue-500 dark:text-blue-400">Agency: {item.agencyName}</p>}
                            </div>
                          </div>
                        </div>
                        <div className="col-span-2 text-right">{item.quantity} {item.unit && <span className="text-xs text-gray-500 dark:text-gray-400">{item.unit}</span>}</div>
                        
                        <div className="col-span-2 text-right">
                          {typeof item.deliveredQuantity === 'number' ? item.deliveredQuantity : '-'}
                        </div>
                        <div className="col-span-2 text-right"> {/* New column data */}
                          {typeof item.receivedQuantity === 'number' ? item.receivedQuantity : '-'}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Vendor Info */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-xl flex items-center gap-2">
                  <Truck className="h-5 w-5 text-blue-500" />
                  Vendor Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center mb-4">
                  <div className="h-12 w-12 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-lg">
                    {order?.vendor?.name.substring(0, 2).toUpperCase()}
                  </div>
                  <div className="ml-4">
                    <h3 className="font-semibold text-lg">{order?.vendor?.name}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Vendor ID: {order?.vendor?.id}</p>
                  </div>
                </div>
                 
                <div className="space-y-3 text-sm">
                  <div className="flex">
                    <span className="text-gray-500 dark:text-gray-400 w-20">Email:</span>
                    <span className="font-medium">{order?.vendor?.email}</span>
                  </div>
                  <div className="flex">
                    <span className="text-gray-500 dark:text-gray-400 w-20">Phone:</span>
                    <span className="font-medium">{order?.vendor?.mobile}</span>
                  </div>
                  <div className="flex">
                    <span className="text-gray-500 dark:text-gray-400 w-20">Address:</span>
                    <span className="font-medium">{order?.vendor?.address1}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Status Update */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-xl flex items-center gap-2">
                  <ClipboardCheck className="h-5 w-5 text-blue-500" />
                  Status Update
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-900">
                    <h3 className="font-medium mb-2">Current Status</h3>
                    <Badge 
                      className={cn(
                        "font-medium border text-xs px-2.5 py-0.5",
                        getStatusColor(order.status)
                      )}
                    >
                      {getDisplayStatusText(order.status)}
                    </Badge>
                    
                    <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                      {getStatusDescriptionText(order.status)}
                    </p>
                  </div>

                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-xl flex items-center gap-2">
              <Clock className="h-5 w-5 text-blue-500" />
              Order Timeline
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative pl-6 space-y-4 before:absolute before:inset-y-0 before:left-6 before:w-0.5 before:bg-gray-300 dark:before:bg-gray-700">
              {(() => {
                const orderStatusHierarchy = ["PENDING", "DELIVERED", "RECEIVED"];
                const currentStatusIndex = orderStatusHierarchy.indexOf(order.status);

                const steps = [
                  { // Order Created
                    title: "Order Created",
                    icon: <ShoppingCart className="h-5 w-5 text-white" />,
                    iconBg: "bg-blue-500",
                    time: format(new Date(order.createdAt), "dd/MM/yy"),
                    description: `Order #${order.poNumber} was created with ${order.items.length} product(s).`,
                    stepStatus: "PENDING",
                  },
                  { // Order Delivered
                    title: "Order Delivered",
                    activeIcon: <Check className="h-5 w-5 text-white" />,
                    activeIconBg: "bg-green-500",
                    placeholderIcon: <Truck className="h-5 w-5 text-gray-600 dark:text-gray-400" />,
                    placeholderIconBg: "bg-gray-300 dark:bg-gray-700",
                    time: (order.status === "DELIVERED" || order.status === "RECEIVED") ? format(new Date(order.updatedAt), "dd/MM/yy HH:mm") : "Awaiting delivery",
                    description: "Order has been marked as delivered by the vendor.",
                    stepStatus: "DELIVERED",
                  },
                  { // Order Received
                    title: "Order Received",
                    activeIcon: <PackageCheck className="h-5 w-5 text-white" />,
                    activeIconBg: "bg-purple-500",
                    placeholderIcon: <Package className="h-5 w-5 text-gray-600 dark:text-gray-400" />,
                    placeholderIconBg: "bg-gray-300 dark:bg-gray-700",
                    time: order.status === "RECEIVED" ? format(new Date(order.updatedAt), "dd/MM/yy HH:mm") : "Awaiting confirmation",
                    description: "Order has been received and verified.",
                    stepStatus: "RECEIVED",
                  },
                ];

                return steps.map((step) => {
                  const stepIndex = orderStatusHierarchy.indexOf(step.stepStatus);
                  let displayIcon, displayIconBg, itemStyle, titleStyle;

                  if (currentStatusIndex === stepIndex) { // Active step
                    displayIcon = step.activeIcon || step.icon;
                    displayIconBg = step.activeIconBg || step.iconBg;
                    itemStyle = "bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 shadow-sm";
                    titleStyle = "font-semibold text-gray-900 dark:text-gray-100";
                  } else if (currentStatusIndex > stepIndex) { // Completed step
                    displayIcon = step.activeIcon || step.icon;
                    displayIconBg = step.activeIconBg || step.iconBg;
                    itemStyle = "bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 shadow-sm opacity-80"; // Slightly faded for completed
                    titleStyle = "font-semibold text-gray-700 dark:text-gray-300";
                  } else { // Placeholder step (future step)
                    displayIcon = step.placeholderIcon || step.icon; // Fallback to main icon if no specific placeholder
                    displayIconBg = step.placeholderIconBg || step.iconBg;
                    itemStyle = "bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 border-dashed opacity-70";
                    titleStyle = "font-semibold text-gray-600 dark:text-gray-400";
                  }

                  return (
                    <div key={step.title} className="relative">
                      <div className={`absolute left-0 top-2 -ml-6 h-10 w-10 rounded-full flex items-center justify-center border-4 border-white dark:border-gray-900 ${displayIconBg}`}>
                        {displayIcon}
                      </div>
                      <div className={`p-4 rounded-lg border shadow-sm ml-8 ${itemStyle}`}>
                        <h3 className={`${titleStyle} flex items-center`}>{step.title}</h3>
                        <time className="block text-xs font-medium text-gray-500 dark:text-gray-400 mt-1 mb-2">
                          {step.time}
                        </time>
                        <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                          {step.description}
                        </p>
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default OrderDetailsPage;
