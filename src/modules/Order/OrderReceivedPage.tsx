import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { get, put } from "@/services/apiService";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Breadcrumb, BreadcrumbItem } from "@/components/ui/breadcrumb";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";
import {
  HomeIcon,
  ArrowLeft,
  ClipboardCheck
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface OrderItem {
  id: string;
  productId: string;
  productName: string;
  priceAtPurchase: number;
  quantity: number; // Ordered quantity
  deliveredQuantity?: number; // Delivered quantity from backend
  agencyId?: string;
  agencyName?: string;
}

interface Order {
  id: string;
  poNumber: string;
  orderDate: string;
  deliveryDate: string; // This is expected delivery date
  contactPersonName: string;
  vendor: {
    id: string;
    name: string;
    email: string;
    mobile: string;
    address: string;
  };
  status: "PENDING" | "DELIVERED" | "RECEIVED" | "PARTIALLY_RECEIVED"; // Added PARTIALLY_RECEIVED
  items: OrderItem[];
  createdAt: string;
  updatedAt: string;
}

interface ReceivedQuantities {
  [itemId: string]: string; // Store as string for input compatibility, parse to number on submit
}

const OrderReceivedPage = () => {
  const { id: orderId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [receivedQuantities, setReceivedQuantities] = useState<ReceivedQuantities>({});

  const recordReceiptMutation = useMutation({
    mutationFn: (receiptData: { items: { orderItemId: string; receivedQuantity: number }[] }) => {
      if (!orderId) throw new Error("Order ID is missing for receipt submission.");
      return put(`/vendor-orders/${orderId}/record-receipt`, receiptData);
    },
    onSuccess: () => {
      toast.success("Receipt recorded successfully!");
      queryClient.invalidateQueries({ queryKey: ["order", orderId] }); // Invalidate to refetch updated order status
      queryClient.invalidateQueries({ queryKey: ["orders"] }); // Invalidate order list
      navigate(`/admin/orders`); // Navigate to order list after successful submission
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || "Failed to record receipt. Please try again.");
      console.error("Submit receipt error:", error);
    },
  });

  const { data: order, isLoading, isError } = useQuery<Order>({
    queryKey: ["order", orderId, "receipt"],
    queryFn: async (): Promise<Order> => {
      if (!orderId) throw new Error("Order ID is undefined");
      const response = await get(`/vendor-orders/${orderId}`);
      const transformedItems = response.items.map((item: any) => ({
        id: String(item.id),
        productId: String(item.productId),
        productName: item.product?.name || 'Unknown Product',
        priceAtPurchase: Number(item.priceAtPurchase || 0),
        quantity: Number(item.quantity || 0),
        deliveredQuantity: item.deliveredQuantity !== null && item.deliveredQuantity !== undefined ? Number(item.deliveredQuantity) : undefined,
        agencyId: item.agency?.id ? String(item.agency.id) : undefined,
        agencyName: item.agency?.name || undefined,
      }));
      const statusUpper = response.status?.toUpperCase() as Order['status'] || "PENDING";
      return { ...response, items: transformedItems, status: statusUpper } as Order;
    },
    enabled: !!orderId,
  });

  useEffect(() => {
    if (order) {
      const initialQuantities = order.items.reduce<ReceivedQuantities>((acc, item) => {
        // Pre-fill with delivered quantity if available, else ordered quantity. Or 0 if nothing delivered yet.
        acc[item.id] = String(item.deliveredQuantity ?? item.quantity); 
        return acc;
      }, {});
      setReceivedQuantities(initialQuantities);
    }
  }, [order]);

  const handleReceivedQuantityChange = (itemId: string, value: string) => {
    setReceivedQuantities(prev => ({ ...prev, [itemId]: value }));
  };

  const handleSubmitReceipt = async () => {
    if (!order || !orderId) {
      toast.error("Order details are not available. Cannot submit receipt.");
      return;
    }

    const itemsToSubmit = order.items.map(item => ({
      orderItemId: item.id,
      receivedQuantity: parseInt(receivedQuantities[item.id] || String(item.deliveredQuantity ?? item.quantity), 10),
    }));

    for (const rItem of itemsToSubmit) {
      const productItem = order.items.find(i => i.id === rItem.orderItemId);
      if (rItem.receivedQuantity < 0) {
        toast.error(`Received quantity for ${productItem?.productName || 'an item'} cannot be negative.`);
        return;
      }
      if (productItem && productItem.deliveredQuantity !== undefined && rItem.receivedQuantity > productItem.deliveredQuantity) {
        toast.warning(`Received quantity for ${productItem.productName} exceeds delivered quantity (${productItem.deliveredQuantity}).`);
        // Potentially allow this with a confirmation, or block it. For now, just a warning.
      }
      if (productItem && rItem.receivedQuantity > productItem.quantity) {
        // This case might be less common if deliveredQuantity is respected
        toast.warning(`Received quantity for ${productItem.productName} exceeds ordered quantity (${productItem.quantity}).`);
      }
    }

    recordReceiptMutation.mutate({ items: itemsToSubmit });
  };

  const getStatusColor = (status: string = "") => {
    switch (status.toUpperCase()) {
      case "PENDING":
        return "bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-800";
      case "DELIVERED": // Vendor has marked as delivered
        return "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800";
      case "PARTIALLY_RECEIVED":
        return "bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-800";
      case "RECEIVED": // All items confirmed as received by admin/store
        return "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-900 dark:text-gray-300 dark:border-gray-800";
    }
  };

  if (isLoading) return <div className="p-6">Loading order details...</div>;
  if (isError || !order) return <div className="p-6 text-red-500">Error loading order details. Please try again.</div>;

  // Check if the order status allows recording receipt (e.g., must be DELIVERED or PARTIALLY_RECEIVED)
  // This logic might be more complex depending on business rules.
  // For now, allowing if not PENDING.
  // if (order.status === "PENDING" || order.status === "RECEIVED") {
  //   return (
  //     <div className="p-6">
  //       <p className="text-lg">Order #{order.poNumber} is currently <strong>{order.status}</strong>.</p>
  //       <p>Receipts can only be recorded for orders that are DELIVERED or PARTIALLY_RECEIVED.</p>
  //       <Button onClick={() => navigate(-1)} className="mt-4">Go Back</Button>
  //     </div>
  //   );
  // }

  return (
    <div className="p-4 md:p-6 space-y-6 bg-gray-50 dark:bg-gray-950 min-h-screen">
      <Breadcrumb className="text-sm">
        <BreadcrumbItem><Link to="/" className="flex items-center text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"><HomeIcon className="h-4 w-4 mr-1.5" /> Home</Link></BreadcrumbItem>
        <BreadcrumbItem><Link to="/admin/orders" className="text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200">Orders</Link></BreadcrumbItem>
        <BreadcrumbItem className="font-medium text-gray-800 dark:text-gray-200">Record Receipt PO#{order.poNumber}</BreadcrumbItem>
      </Breadcrumb>

      <div className="flex flex-col lg:flex-row gap-6">
        <div className="lg:w-2/3 space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-4">
              <CardTitle className="text-2xl font-semibold text-gray-800 dark:text-gray-100">Record Receipt for Order #{order.poNumber}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 text-sm">
                <div>
                  <p className="text-gray-500 dark:text-gray-400">PO Number</p>
                  <p className="font-medium text-gray-800 dark:text-gray-200">{order.poNumber}</p>
                </div>
                <div>
                  <p className="text-gray-500 dark:text-gray-400">Order Date</p>
                  <p className="font-medium text-gray-800 dark:text-gray-200">{format(new Date(order.orderDate), "dd/MM/yy")}</p>
                </div>    
                <div>
                  <p className="text-gray-500 dark:text-gray-400">Expected Delivery Date</p>
                  <p className="font-medium text-gray-800 dark:text-gray-200">{format(new Date(order.deliveryDate), "dd/MM/yy")}</p>
                </div>
                <div>
                  <p className="text-gray-500 dark:text-gray-400">Status</p>
                  <Badge className={cn("text-xs font-semibold px-2 py-0.5 rounded-full", getStatusColor(order.status))}>
                    {order.status}
                  </Badge>
                </div>
                <div>
                  <p className="text-gray-500 dark:text-gray-400">Contact Person</p>
                  <p className="font-medium text-gray-800 dark:text-gray-200">{order.contactPersonName}</p>
                </div>
              </div>

              <div className="space-y-1 pt-4">
                <h3 className="text-lg font-medium text-gray-800 dark:text-gray-100">Order Items</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">Enter the quantity received for each item.</p>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-100 dark:bg-gray-800">
                    <tr>
                      <th className="px-4 py-2 text-left font-medium text-gray-600 dark:text-gray-300">Product</th>
                      <th className="px-4 py-2 text-right font-medium text-gray-600 dark:text-gray-300">Ordered</th>
                      <th className="px-4 py-2 text-right font-medium text-gray-600 dark:text-gray-300">Delivered</th>
                      <th className="px-4 py-2 text-right font-medium text-gray-600 dark:text-gray-300 w-32">Received Qty</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {order.items.map(item => (
                      <tr key={item.id}>
                        <td className="px-4 py-3 text-gray-800 dark:text-gray-200">
                          {item.productName}
                          {item.agencyName && <span className="block text-xs text-gray-500 dark:text-gray-400">Agency: {item.agencyName}</span>}
                        </td>
                        <td className="px-4 py-3 text-right text-gray-600 dark:text-gray-300">{item.quantity}</td>
                        <td className="px-4 py-3 text-right text-gray-600 dark:text-gray-300">{item.deliveredQuantity ?? 'N/A'}</td>
                        <td className="px-4 py-3">
                          <Input
                            type="number"
                            value={receivedQuantities[item.id] || ''}
                            onChange={(e) => handleReceivedQuantityChange(item.id, e.target.value)}
                            className="w-full text-right dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600"
                            min="0"
                            // max={item.deliveredQuantity ?? item.quantity} // Optional: enforce max based on delivered/ordered
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
            <CardFooter className="flex justify-end pt-6 border-t border-gray-200 dark:border-gray-700">
              <Button 
                variant="outline" 
                onClick={() => navigate(-1)} 
                className="mr-3"
                disabled={recordReceiptMutation.isPending}
              >
                <ArrowLeft className="h-4 w-4 mr-1.5" /> Cancel
              </Button>
              <Button 
                onClick={handleSubmitReceipt} 
                disabled={recordReceiptMutation.isPending || Object.keys(receivedQuantities).length === 0}
                className="flex items-center"
              >
                <ClipboardCheck className="h-4 w-4 mr-1.5" />
                {recordReceiptMutation.isPending ? "Submitting..." : "Submit Received Quantities"}
              </Button>
            </CardFooter>
          </Card>
        </div>

        {/* Right Column: Vendor Details */}
        <div className="lg:w-1/3 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-xl font-semibold text-gray-800 dark:text-gray-100">Vendor Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <p className="text-gray-500 dark:text-gray-400">Name</p>
                <p className="font-medium text-gray-800 dark:text-gray-200">{order.vendor.name}</p>
              </div>
              <div>
                <p className="text-gray-500 dark:text-gray-400">Email</p>
                <p className="font-medium text-gray-800 dark:text-gray-200">{order.vendor.email}</p>
              </div>
              <div>
                <p className="text-gray-500 dark:text-gray-400">Mobile</p>
                <p className="font-medium text-gray-800 dark:text-gray-200">{order.vendor.mobile}</p>
              </div>
              <div>
                <p className="text-gray-500 dark:text-gray-400">Address</p>
                <p className="font-medium text-gray-800 dark:text-gray-200">{order.vendor.address}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

// Need to import queryClient from where it's initialized, typically App.tsx or a custom hook
// For now, assuming it's globally available or will be passed/imported.
// This is a placeholder for the actual import.
import { QueryClient } from '@tanstack/react-query'; 
// A mock queryClient, replace with your actual client instance
const queryClient = new QueryClient(); 

export default OrderReceivedPage;
