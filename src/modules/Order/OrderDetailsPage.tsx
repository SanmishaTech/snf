import { useState, useMemo } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { get } from "@/services/apiService";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

import { format } from "date-fns";
import {
  Truck,
  Package,
  ShoppingCart,
  Check,
  ClipboardCheck,
  PackageCheck
} from "lucide-react";
import { cn } from "@/lib/utils";

interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: string;
  agencyId?: string | number; 
  agencyName?: string;
}

interface OrderItem {
  id: string;
  productId: string;
  productName: string;
  priceAtPurchase: number; 
  quantity: number;
  deliveredQuantity?: number; 
  receivedQuantity?: number; 
  supervisorQuantity?: number;
  agencyId?: string; 
  agencyName?: string; 
  unit?: string; 
  depotId?: string;
  depotName?: string;
  depotVariantId?: string;
  depotVariantName?: string;
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

  const { data: currentUserProfile, isLoading: isLoadingUserProfile } = useQuery<UserProfile>({
    queryKey: ["currentUserProfile"],
    queryFn: async () => {
      const token = localStorage.getItem("authToken");
      if (!token) {
        throw new Error('User not authenticated');
      }
      return get("/api/users/me");
    },
    staleTime: 5 * 60 * 1000,
    enabled: Boolean(localStorage.getItem("authToken")), // Only run query if authenticated
  });

  const { data: order, isLoading, isError } = useQuery<Order>({
    queryKey: ["order", id],
    queryFn: async (): Promise<Order> => {
      const response = await get(`/vendor-orders/${id}`);
      const transformedItems = response.items.map((item: any) => ({
        id: String(item.id),
        productId: String(item.productId),
        productName: item.product?.name || 'Unknown Product',
        priceAtPurchase: Number(item.priceAtPurchase || 0),
        deliveredQuantity: item.deliveredQuantity !== null && item.deliveredQuantity !== undefined ? Number(item.deliveredQuantity) : undefined,
        receivedQuantity: item.receivedQuantity !== null && item.receivedQuantity !== undefined ? Number(item.receivedQuantity) : undefined, 
        supervisorQuantity: item.supervisorQuantity !== null && item.supervisorQuantity !== undefined ? Number(item.supervisorQuantity) : undefined,
        quantity: Number(item.quantity || 0),
        agencyId: item.agency?.id ? String(item.agency.id) : undefined,
        agencyName: item.agency?.name || undefined,
        unit: item.product?.unit || undefined,
        depotId: item.depot?.id ? String(item.depot.id) : undefined,
        depotName: item.depot?.name || undefined,
        depotVariantId: item.depotVariant?.id ? String(item.depotVariant.id) : undefined,
        depotVariantName: item.depotVariant?.name || undefined,
      }));
      return { ...response, items: transformedItems } as Order;
    },
  });

  const itemsToDisplay = useMemo(() => {
    if (!order?.items) return [];
    if (currentUserProfile?.role === 'AGENCY' && currentUserProfile.agencyId != null) {
      return order.items.filter(
        item => item.agencyId != null && String(item.agencyId) === String(currentUserProfile.agencyId)
      );
    }
    return order.items;
  }, [order, currentUserProfile]);

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
        const knownStatus = status as string; 
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

  

  if (isLoading || isLoadingUserProfile) { 
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gray-50 dark:bg-gray-900">
        <div className="flex flex-col items-center justify-center h-screen bg-gray-50 dark:bg-gray-900">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500" />
        </div>
      </div>
    );
  }

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

  return (
    <div className="container mx-auto py-4 md:py-6 space-y-4 md:space-y-6 px-4 sm:px-6 lg:px-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight">Order #{order.poNumber}</h1>
          </div>
        </div>
      </div>

      {/* Tabs for Details and Timeline */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="-mb-px flex flex-wrap space-x-4 sm:space-x-6" aria-label="Tabs">
          <button
            onClick={() => setActiveTab("details")}
            className={cn(
              "whitespace-nowrap py-2 md:py-3 px-1 border-b-2 font-medium text-sm",
              activeTab === "details"
                ? "border-blue-500 text-blue-600 dark:border-blue-400 dark:text-blue-300"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:border-gray-500"
            )}
          >
            Order Details
          </button>
          {currentUserProfile?.role !== 'AGENCY' && (
            <button
              onClick={() => setActiveTab("timeline")}
              className={cn(
                "whitespace-nowrap py-2 md:py-3 px-1 border-b-2 font-medium text-sm",
                activeTab === "timeline"
                  ? "border-blue-500 text-blue-600 dark:border-blue-400 dark:text-blue-300"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:border-gray-500"
              )}
            >
              Order Timeline
            </button>
          )}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === "details" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6 mt-4 md:mt-6">
          {/* Main Order Details */}
          <div className="lg:col-span-2 space-y-4 md:space-y-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base sm:text-lg md:text-xl flex items-center gap-2">
                  <ShoppingCart className="h-4 w-4 sm:h-5 sm:w-5 text-secondary" />
                  Order Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
                  <div>
                    <h3 className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400">Order Number</h3>
                    <p className="mt-1 text-base sm:text-lg font-semibold truncate">{order.poNumber}</p>
                  </div>
                  <div>
                    <h3 className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400">Status</h3>
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
                    <h3 className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400">Order Date</h3>
                    <p className="mt-1 text-sm sm:text-base text-gray-900 dark:text-gray-100">
                      {format(new Date(order.orderDate), "dd/MM/yyyy")}
                    </p>
                  </div>
                  <div>
                    <h3 className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400">Delivery Date</h3>
                    <p className="mt-1 text-sm sm:text-base text-gray-900 dark:text-gray-100">
                      {format(new Date(order.deliveryDate), "dd/MM/yyyy")}
                    </p>
                  </div>
                  <div className="sm:col-span-2">
                    <h3 className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400">Contact Person</h3>
                    <p className="mt-1 text-sm sm:text-base text-gray-900 dark:text-gray-100 break-words">{order.contactPersonName}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Order Items */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base sm:text-lg md:text-xl flex items-center gap-2">
                  <Package className="h-4 w-4 sm:h-5 sm:w-5 text-secondary" />
                  Order Items
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto border rounded-lg">
                  <div className={currentUserProfile?.role === 'SUPERVISOR' || currentUserProfile?.role === 'ADMIN' ? "min-w-[800px]" : "min-w-[600px]"}>
                    <div className={cn(
                      "bg-gray-50 dark:bg-gray-900 px-2 sm:px-4 py-3 text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400 grid",
                      currentUserProfile?.role === 'SUPERVISOR' || currentUserProfile?.role === 'ADMIN' ? "grid-cols-16" : "grid-cols-12"
                    )}>
                      <div className={currentUserProfile?.role === 'SUPERVISOR' || currentUserProfile?.role === 'ADMIN' ? "col-span-4" : "col-span-6"}>Product</div> 
                      <div className="col-span-2 text-right text-xs sm:text-sm">Ordered</div>
                      <div className="col-span-2 text-right text-xs sm:text-sm">Delivered</div>
                      <div className="col-span-2 text-right text-xs sm:text-sm">Received</div>
                      {(currentUserProfile?.role === 'SUPERVISOR' || currentUserProfile?.role === 'ADMIN') && (
                        <div className="col-span-2 text-right text-xs sm:text-sm">Supervisor</div>
                      )}
                    </div>
                    <div className="divide-y divide-gray-200 dark:divide-gray-800">
                      {itemsToDisplay.map((item) => (
                        <div key={item.id} className={cn(
                          "px-2 sm:px-4 py-3 sm:py-4 grid items-center",
                          currentUserProfile?.role === 'SUPERVISOR' || currentUserProfile?.role === 'ADMIN' ? "grid-cols-16" : "grid-cols-12"
                        )}>
                          <div className={currentUserProfile?.role === 'SUPERVISOR' || currentUserProfile?.role === 'ADMIN' ? "col-span-4" : "col-span-6"}> 
                            <div className="flex items-center">
                              <div className="h-8 w-8 sm:h-10 sm:w-10 flex-shrink-0 rounded-md bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                                <Package className="h-4 w-4 sm:h-5 sm:w-5 text-gray-500" />
                              </div>
                              <div className="ml-2 sm:ml-4 min-w-0 flex-1">
                                <p className="font-medium text-xs sm:text-sm text-gray-900 dark:text-gray-100 truncate">
                                  {item.productName} {item.depotVariantName && `(${item.depotVariantName})`}
                                </p>
                                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                  {item.depotName && <div className="truncate">Depot: {item.depotName}</div>}
                                  {item.agencyName && <div className="truncate text-secondary dark:text-blue-400">Agency: {item.agencyName}</div>}
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="col-span-2 text-right text-xs sm:text-sm">
                            <div className="font-medium">{item.quantity}</div>
                            {item.depotVariantName && <div className="text-xs text-gray-500 dark:text-gray-400 truncate">({item.depotVariantName})</div>}
                          </div>
                          <div className="col-span-2 text-right text-xs sm:text-sm">
                            {typeof item.deliveredQuantity === 'number' ? (
                              <>
                                <div className="font-medium">{item.deliveredQuantity}</div>
                                {item.depotVariantName && <div className="text-xs text-gray-500 dark:text-gray-400 truncate">({item.depotVariantName})</div>}
                              </>
                            ) : <span className="text-gray-400">-</span>}
                          </div>
                          <div className="col-span-2 text-right text-xs sm:text-sm"> 
                            {typeof item.receivedQuantity === 'number' ? (
                              <>
                                <div className="font-medium">{item.receivedQuantity}</div>
                                {item.depotVariantName && <div className="text-xs text-gray-500 dark:text-gray-400 truncate">({item.depotVariantName})</div>}
                              </>
                            ) : <span className="text-gray-400">-</span>}
                          </div>
                          {(currentUserProfile?.role === 'SUPERVISOR' || currentUserProfile?.role === 'ADMIN') && (
                            <div className="col-span-2 text-right text-xs sm:text-sm">
                              {typeof item.supervisorQuantity === 'number' ? (
                                <>
                                  <div className="font-medium">{item.supervisorQuantity}</div>
                                  {item.depotVariantName && <div className="text-xs text-gray-500 dark:text-gray-400 truncate">({item.depotVariantName})</div>}
                                </>
                              ) : <span className="text-gray-400">-</span>}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-4 md:space-y-6">
            {/* Vendor Info */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base sm:text-lg md:text-xl flex items-center gap-2">
                  <Truck className="h-4 w-4 sm:h-5 sm:w-5 text-secondary" />
                  Vendor Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center mb-4">
                  <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm sm:text-lg flex-shrink-0">
                    {order?.vendor?.name.substring(0, 2).toUpperCase()}
                  </div>
                  <div className="ml-3 sm:ml-4 min-w-0 flex-1">
                    <h3 className="font-semibold text-sm sm:text-lg truncate">{order?.vendor?.name}</h3>
                  </div>
                </div>
                 
                <div className="space-y-3 text-xs sm:text-sm">
                  <div className="grid grid-cols-1 gap-2">
                    <div>
                      <span className="text-gray-500 dark:text-gray-400 block">Email:</span>
                      <span className="font-medium break-all">{order?.vendor?.email}</span>
                    </div>
                    <div>
                      <span className="text-gray-500 dark:text-gray-400 block">Phone:</span>
                      <span className="font-medium">{order?.vendor?.mobile}</span>
                    </div>
                    <div>
                      <span className="text-gray-500 dark:text-gray-400 block">Address:</span>
                      <span className="font-medium break-words">{order?.vendor?.address}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Status Update */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base sm:text-lg md:text-xl flex items-center gap-2">
                  <ClipboardCheck className="h-4 w-4 sm:h-5 sm:w-5 text-secondary" />
                  Status Update
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-3 sm:p-4 rounded-lg bg-gray-50 dark:bg-gray-900">
                    <h3 className="font-medium mb-2 text-sm sm:text-base">Current Status</h3>
                    <Badge 
                      className={cn(
                        "font-medium border text-xs px-2.5 py-0.5",
                        getStatusColor(order.status)
                      )}
                    >
                      {getDisplayStatusText(order.status)}
                    </Badge>
                    
                    <p className="mt-2 text-xs sm:text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                      {getStatusDescriptionText(order.status)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {activeTab === "timeline" && currentUserProfile?.role !== 'AGENCY' && (
        <Card className="mt-4 md:mt-6">
          <CardHeader>
            <CardTitle className="text-base sm:text-lg md:text-xl font-semibold text-gray-800 dark:text-gray-100">Order Progress Timeline</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative pl-4 sm:pl-6 space-y-4 before:absolute before:inset-y-0 before:left-4 sm:before:left-6 before:w-0.5 before:bg-gray-300 dark:before:bg-gray-700">
              {(() => {
                const orderStatusHierarchy = ["PENDING", "DELIVERED", "RECEIVED"];
                const currentStatusIndex = orderStatusHierarchy.indexOf(order.status);

                const steps = [
                  { 
                    title: "Order Created",
                    icon: <ShoppingCart className="h-5 w-5 text-white" />,
                    iconBg: "bg-secondary",
                    time: format(new Date(order.createdAt), "dd/MM/yyyy"),
                    description: `Order #${order.poNumber} was created with ${order.items.length} product(s).`,
                    stepStatus: "PENDING",
                  },
                  { 
                    title: "Order Delivered",
                    activeIcon: <Check className="h-5 w-5 text-white" />,
                    activeIconBg: "bg-primary",
                    placeholderIcon: <Truck className="h-5 w-5 text-gray-600 dark:text-gray-400" />,
                    placeholderIconBg: "bg-gray-300 dark:bg-gray-700",
                    time: (order.status === "DELIVERED" || order.status === "RECEIVED") ? format(new Date(order.updatedAt), "dd/MM/yyyy HH:mm") : "Awaiting delivery",
                    description: "Order has been marked as delivered by the vendor.",
                    stepStatus: "DELIVERED",
                  },
                  { 
                    title: "Order Received",
                    activeIcon: <PackageCheck className="h-5 w-5 text-white" />,
                    activeIconBg: "bg-purple-500",
                    placeholderIcon: <Package className="h-5 w-5 text-gray-600 dark:text-gray-400" />,
                    placeholderIconBg: "bg-gray-300 dark:bg-gray-700",
                    time: order.status === "RECEIVED" ? format(new Date(order.updatedAt), "dd/MM/yyyy HH:mm") : "Awaiting confirmation",
                    description: "Order has been received and verified.",
                    stepStatus: "RECEIVED",
                  },
                ];

                return steps.map((step) => {
                  const stepIndex = orderStatusHierarchy.indexOf(step.stepStatus);
                  let displayIcon, displayIconBg, itemStyle, titleStyle;

                  if (currentStatusIndex === stepIndex) { 
                    displayIcon = step.activeIcon || step.icon;
                    displayIconBg = step.activeIconBg || step.iconBg;
                    itemStyle = "bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 shadow-sm";
                    titleStyle = "font-semibold text-gray-900 dark:text-gray-100";
                  } else if (currentStatusIndex > stepIndex) { 
                    displayIcon = step.activeIcon || step.icon;
                    displayIconBg = step.activeIconBg || step.iconBg;
                    itemStyle = "bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 shadow-sm opacity-80"; 
                    titleStyle = "font-semibold text-gray-700 dark:text-gray-300";
                  } else { 
                    displayIcon = step.placeholderIcon || step.icon; 
                    displayIconBg = step.placeholderIconBg || step.iconBg;
                    itemStyle = "bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 border-dashed opacity-70";
                    titleStyle = "font-semibold text-gray-600 dark:text-gray-400";
                  }

                  return (
                    <div key={step.title} className="relative">
                      <div className={`absolute left-0 top-2 -ml-4 sm:-ml-6 h-8 w-8 sm:h-10 sm:w-10 rounded-full flex items-center justify-center border-2 sm:border-4 border-white dark:border-gray-900 ${displayIconBg}`}>
                        <div className="h-4 w-4 sm:h-5 sm:w-5">{displayIcon}</div>
                      </div>
                      <div className={`p-3 sm:p-4 rounded-lg border shadow-sm ml-6 sm:ml-8 ${itemStyle}`}>
                        <h3 className={`${titleStyle} flex items-center text-sm sm:text-base`}>{step.title}</h3>
                        <time className="block text-xs font-medium text-gray-500 dark:text-gray-400 mt-1 mb-2">
                          {step.time}
                        </time>
                        <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
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
