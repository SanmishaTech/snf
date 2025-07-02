import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery, useMutation, QueryClient } from "@tanstack/react-query"; 
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
  depotId?: string;
  depotName?: string;
  depotVariantId?: string;
  depotVariantName?: string;
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
  status: "PENDING" | "DELIVERED" | "RECEIVED"; // Removed PARTIALLY_RECEIVED
  items: OrderItem[];
  createdAt: string;
  updatedAt: string;
}

interface UserProfile {
  role: string;
  agencyId?: string | number; 
}

interface ReceivedQuantities {
  [itemId: string]: string; // Store as string for input compatibility, parse to number on submit
}

const OrderReceivedPage = () => {
  const { id: orderId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [receivedQuantities, setReceivedQuantities] = useState<ReceivedQuantities>({});

  const { data: currentUserProfile, isLoading: isLoadingUserProfile } = useQuery<UserProfile>({
    queryKey: ["currentUserProfile"],
    queryFn: async () => get("/api/users/me"), 
  });

  const recordReceiptMutation = useMutation({
    mutationFn: (receiptData: { items: { orderItemId: string; receivedQuantity: number }[] }) => {
      if (!orderId) throw new Error("Order ID is missing for receipt submission.");
      return put(`/vendor-orders/${orderId}/record-receipt`, receiptData);
    },
    onSuccess: () => {
      toast.success("Receipt recorded successfully!");
      queryClient.invalidateQueries({ queryKey: ["order", orderId] }); 
      queryClient.invalidateQueries({ queryKey: ["orders"] }); 
      navigate(`/admin/orders`); 
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
        depotId: item.depot?.id ? String(item.depot.id) : undefined,
        depotName: item.depot?.name || undefined,
        depotVariantId: item.depotVariant?.id ? String(item.depotVariant.id) : undefined,
        depotVariantName: item.depotVariant?.name || undefined,
      }));
      const statusUpper = response.status?.toUpperCase() as Order['status'] || "PENDING";
      return { ...response, items: transformedItems, status: statusUpper } as Order;
    },
    enabled: !!orderId,
  });

  useEffect(() => {
    if (order) {
      const initialQuantities = order.items.reduce<ReceivedQuantities>((acc, item) => {
        acc[item.id] = String(item.deliveredQuantity ?? item.quantity); 
        return acc;
      }, {});
      setReceivedQuantities(initialQuantities);
    }
  }, [order]);

  const handleReceivedQuantityChange = (itemId: string, value: string) => {
    setReceivedQuantities(prev => ({ ...prev, [itemId]: value }));
  };

  const handleSubmitReceipt = () => {
    if (!order || !order.items || !currentUserProfile) { 
      toast.error("Order data or user profile is not loaded yet.");
      return;
    }

    let relevantItemIdsForSubmission: Set<string> | null = null;

    // If the user is an agency, only consider items assigned to their agency for submission
    if (currentUserProfile.role === 'AGENCY' && currentUserProfile.agencyId != null) {
      relevantItemIdsForSubmission = new Set(
        order.items
          .filter(item => item.agencyId != null && String(item.agencyId) === String(currentUserProfile.agencyId))
          .map(item => item.id)
      );
    }

    const itemsToSubmit = Object.entries(receivedQuantities)
      .filter(([itemId]) => {
        // If relevantItemIdsForSubmission is set (i.e., for an agency user),
        // only include items that are in that set.
        // Otherwise (for admin or other roles), include all items with entered quantities.
        if (relevantItemIdsForSubmission) {
          return relevantItemIdsForSubmission.has(itemId);
        }
        return true; 
      })
      .map(([itemId, quantityStr]) => {
        const itemDetail = order.items.find(i => i.id === itemId);
        if (!itemDetail) return null; 

        const receivedQuantity = parseInt(quantityStr, 10);
        if (isNaN(receivedQuantity) || receivedQuantity < 0) {
          toast.info(`Invalid quantity for item ${itemDetail.productName}. Please enter a valid non-negative number.`);
          return null; 
        }
        
        if (itemDetail.deliveredQuantity !== undefined && receivedQuantity > itemDetail.deliveredQuantity) {
          toast.info(`Received quantity for ${itemDetail.productName} (${receivedQuantity}) cannot exceed delivered quantity (${itemDetail.deliveredQuantity}).`);
          return null;
        }
        return {
          orderItemId: itemId,
          receivedQuantity: receivedQuantity,
        };
      })
      .filter(item => item !== null) as { orderItemId: string; receivedQuantity: number }[];

    if (itemsToSubmit.length === 0) {
      toast.info(
        currentUserProfile.role === 'AGENCY' 
        ? "No quantities entered for your agency's items, or all quantities are invalid/exceed delivered amounts. Nothing to submit."
        : "No quantities entered or all quantities are invalid/exceed delivered amounts. Nothing to submit."
      );
      return;
    }
    recordReceiptMutation.mutate({ items: itemsToSubmit });
  };

  const getStatusColor = (status: string = "") => {
    switch (status.toUpperCase()) {
      case "PENDING":
        return "bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-800";
      case "DELIVERED": 
        return "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800";
      case "PARTIALLY_RECEIVED":
        return "bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-800";
      case "RECEIVED": 
        return "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-900 dark:text-gray-300 dark:border-gray-800";
    }
  };

  if (isLoading || isLoadingUserProfile) return <div className="p-6">Loading order details...</div>;
  if (isError || !order) return <div className="p-6 text-red-500">Error loading order details. Please try again.</div>;

  return (
    <div className="p-4 md:p-6 space-y-6 bg-gray-50 dark:bg-gray-950 min-h-screen">
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
                  <p className="font-medium text-gray-800 dark:text-gray-200">{format(new Date(order.orderDate), "dd/MM/yyyy")}</p>
                </div>    
                <div>
                  <p className="text-gray-500 dark:text-gray-400">Expected Delivery Date</p>
                  <p className="font-medium text-gray-800 dark:text-gray-200">{format(new Date(order.deliveryDate), "dd/MM/yyyy")}</p>
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
                    {(currentUserProfile?.role === 'AGENCY' && currentUserProfile?.agencyId != null
                      ? (order?.items || []).filter(item => 
                          item.agencyId != null && String(item.agencyId) === String(currentUserProfile.agencyId)
                        )
                      : (order?.items || [])
                    ).map(item => (
                      <tr key={item.id}>
                        <td className="px-4 py-3 text-gray-800 dark:text-gray-200">
                          {item.productName}
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {item.depotName && <span>Depot: {item.depotName}</span>}
                            {item.depotVariantName && <span> ({item.depotVariantName})</span>}
                          </div>
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
                disabled={recordReceiptMutation.isPending || isLoadingUserProfile}
              >
                <ArrowLeft className="h-4 w-4 mr-1.5" /> Cancel
              </Button>
              <Button 
                onClick={handleSubmitReceipt} 
                disabled={recordReceiptMutation.isPending || Object.keys(receivedQuantities).length === 0 || isLoadingUserProfile}
                className="flex items-center"
              >
                <ClipboardCheck className="h-4 w-4 mr-1.5" />
                {recordReceiptMutation.isPending ? "Submitting..." : "Submit Received Quantities"}
              </Button>
            </CardFooter>
          </Card>
        </div>

        <div className="lg:w-1/3 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-xl font-semibold text-gray-800 dark:text-gray-100">Vendor Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <p className="text-gray-500 dark:text-gray-400">Name</p>
                <p className="font-medium text-gray-800 dark:text-gray-200">{order?.vendor?.name}</p>
              </div>
              <div>
                <p className="text-gray-500 dark:text-gray-400">Email</p>
                <p className="font-medium text-gray-800 dark:text-gray-200">{order?.vendor?.email}</p>
              </div>
              <div>
                <p className="text-gray-500 dark:text-gray-400">Mobile</p>
                <p className="font-medium text-gray-800 dark:text-gray-200">{order?.vendor?.mobile}</p>
              </div>
              <div>
                <p className="text-gray-500 dark:text-gray-400">Address</p>
                <p className="font-medium text-gray-800 dark:text-gray-200">{order?.vendor?.address1}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

const queryClient = new QueryClient(); 

export default OrderReceivedPage;
