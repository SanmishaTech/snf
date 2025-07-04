import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
// useMutation will be used when API submission is implemented
import { useQuery, useMutation } from "@tanstack/react-query"; 
import { get, put } from "@/services/apiService"; 
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";
import {
  ClipboardCheck // Re-using for submit
  // Removed Truck, Package, ShoppingCart, FileText, InfoIcon
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface OrderItem {
  id: string;
  productId: string;
  productName: string;
  priceAtPurchase: number;
  quantity: number; // Ordered quantity
  productUnit?: string; // Added product unit
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
  items: OrderItem[];
  createdAt: string;
  updatedAt: string;
}

interface DeliveredQuantities {
  [itemId: string]: string; // Store as string for input compatibility, parse to number on submit
}

const OrderDeliveryPage = () => {
  const { id: orderId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [deliveredQuantities, setDeliveredQuantities] = useState<DeliveredQuantities>({});

  const recordDeliveryMutation = useMutation({
    mutationFn: (deliveryData: { items: { orderItemId: string; deliveredQuantity: number }[] }) => {
      if (!orderId) throw new Error("Order ID is missing for delivery submission.");
      return put(`/vendor-orders/${orderId}/record-delivery`, deliveryData);
    },
    onSuccess: () => {
      toast.success("Delivery recorded successfully!");
      // refetch(); // Or invalidate query for the order list/details
      navigate(`/admin/orders`); // Navigate to order list after successful submission
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || "Failed to record delivery. Please try again.");
      console.error("Submit delivery error:", error);
    },
  });

  // refetch can be added back if manual refetching is needed post-submission
  const { data: order, isLoading, isError /*, refetch*/ } = useQuery<Order>({
    queryKey: ["order", orderId, "delivery"],
    // Keep previous data while fetching to prevent UI flicker if status changes
    // and this page is revisited, though navigation usually handles this.
    // staleTime: 5 * 60 * 1000, // Optional: consider data freshness

    queryFn: async (): Promise<Order> => {
      if (!orderId) throw new Error("Order ID is undefined");
      const response = await get(`/vendor-orders/${orderId}`);
      const transformedItems = response.items.map((item: any) => ({
        id: String(item.id),
        productId: String(item.productId),
        productName: item.product?.name || 'Unknown Product',
        productUnit: item.product?.unit || '', // Extract product unit, fallback to empty string
        priceAtPurchase: Number(item.priceAtPurchase || 0),
        quantity: Number(item.quantity || 0),
        agencyId: item.agency?.id ? String(item.agency.id) : undefined,
        agencyName: item.agency?.name || undefined,
        depotId: item.depot?.id ? String(item.depot.id) : undefined,
        depotName: item.depot?.name || undefined,
        depotVariantId: item.depotVariant?.id ? String(item.depotVariant.id) : undefined,
        depotVariantName: item.depotVariant?.name || undefined,
      }));
      // Standardize status to uppercase to match interface
      const statusUpper = response.status?.toUpperCase() as Order['status'] || "PENDING";
      return { ...response, items: transformedItems, status: statusUpper } as Order;
    },
    enabled: !!orderId,
  });

  useEffect(() => {
    if (order) {
      const initialQuantities = order.items.reduce<DeliveredQuantities>((acc, item) => {
        acc[item.id] = String(item.quantity); // Pre-fill with ordered quantity
        return acc;
      }, {});
      setDeliveredQuantities(initialQuantities);
    }
  }, [order]);

  const handleDeliveredQuantityChange = (itemId: string, value: string) => {
    const item = order?.items.find(i => i.id === itemId);

    if (item) {
      const deliveredQty = parseInt(value, 10);
      if (!isNaN(deliveredQty) && deliveredQty > item.quantity) {
        toast.error(`Delivered quantity for ${item.productName} cannot exceed ordered quantity of ${item.quantity}.`);
        setDeliveredQuantities(prev => ({ ...prev, [itemId]: String(item.quantity) }));
        return;
      }
    }

    setDeliveredQuantities(prev => ({ ...prev, [itemId]: value }));
  };

  const handleSubmitDelivery = async () => {
    if (!order || !orderId) {
      toast.error("Order details are not available. Cannot submit delivery.");
      return;
    }

    const itemsToSubmit = order.items.map(item => ({
      orderItemId: item.id,
      deliveredQuantity: parseInt(deliveredQuantities[item.id] || String(item.quantity), 10), // Default to ordered if not changed
    }));

    // Validate quantities
    for (const ditem of itemsToSubmit) {
      const product = order.items.find(i => i.id === ditem.orderItemId);
      if (ditem.deliveredQuantity < 0) {
        toast.error(`Delivered quantity for ${product?.productName || 'an item'} cannot be negative.`);
        return;
      }
      // Optional: Add more complex validation if needed (e.g., exceeding ordered quantity)
      // if (product && ditem.deliveredQuantity > product.quantity) {
      //   toast.warning(`Delivered quantity for ${product.productName} exceeds ordered quantity.`);
      //   // Decide if this is a blocking error or just a warning
      // }
    }

    recordDeliveryMutation.mutate({ items: itemsToSubmit });
  };

  const getStatusColor = (status: string = "") => {
    switch (status.toUpperCase()) {
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

  if (isLoading) return <div className="p-6">Loading order details...</div>;
  if (isError || !order) return <div className="p-6 text-red-500">Error loading order details. Please try again.</div>;

  return (
    <div className="p-4 md:p-6 space-y-6 bg-gray-50 dark:bg-gray-950 min-h-screen">
    

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left Column: Order Details & Items */}
        <div className="lg:w-2/3 space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-4">
              <CardTitle className="text-2xl font-semibold text-gray-800 dark:text-gray-100">Record Delivery for Order #{order.poNumber}</CardTitle>
              {/* <Button variant="outline" size="sm" onClick={() => navigate(-1)} className="flex items-center">
                <ArrowLeft className="h-4 w-4 mr-1.5" /> Back
              </Button> */}
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
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-xl font-medium text-gray-800 dark:text-gray-100">Order Items</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-800">
                    <tr>
                      <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Product</th>
                      <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Agency</th>
                      <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Ordered Qty</th>
                      <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Delivered Qty</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800/50 divide-y divide-gray-200 dark:divide-gray-700">
                    {order.items.map((item) => (
                      <tr key={item.id}>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{item.productName}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {item.depotName && <span>Depot: {item.depotName}</span>}
                            {item.depotVariantName && <span> ({item.depotVariantName})</span>}
                          </div>
                          {/* <div className="text-xs text-gray-500 dark:text-gray-400">ID: {item.productId}</div> */}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{item.agencyName || 'N/A'}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-gray-500 dark:text-gray-400">
                          {item.quantity} {item.depotVariantName && `(${item.depotVariantName})`}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-right">
                          <div className="flex items-center justify-end space-x-2">
                            <Input
                              type="number"
                              value={deliveredQuantities[item.id] || ''}
                              onChange={(e) => handleDeliveredQuantityChange(item.id, e.target.value)}
                              onFocus={(e) => e.target.select()} // Select all text on focus
                              className="w-20 dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600 text-right pr-1"
                              min="0"
                              disabled={order?.status?.toUpperCase() === "DELIVERED"}
                              // max={item.quantity} // Optional: prevent delivering more than ordered
                            />
                            {item.depotVariantName && <span className="text-gray-500 dark:text-gray-400">{item.depotVariantName}</span>}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
            <CardFooter className="flex flex-col items-end pt-4">
                {order?.status?.toUpperCase() === "DELIVERED" && (
                  <p className="text-sm text-green-600 dark:text-green-400 mb-2">
                    Delivery has already been recorded for this order and cannot be modified.
                  </p>
                )}
                <Button 
                  onClick={handleSubmitDelivery} 
                  className="flex items-center" 
                  disabled={order?.status?.toUpperCase() === "DELIVERED" || recordDeliveryMutation.isPending}
                >
                    <ClipboardCheck className="h-4 w-4 mr-2" /> Submit Delivery
                </Button>
            </CardFooter>
          </Card>
        </div>

        {/* Right Column: Vendor & Summary */}
        <div className="lg:w-1/3 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-xl font-medium text-gray-800 dark:text-gray-100">Vendor Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p><strong className="text-gray-600 dark:text-gray-300">Name:</strong> {order.vendor.name}</p>
              <p><strong className="text-gray-600 dark:text-gray-300">Email:</strong> {order.vendor.email}</p>
              <p><strong className="text-gray-600 dark:text-gray-300">Mobile:</strong> {order.vendor.mobile}</p>
              <p><strong className="text-gray-600 dark:text-gray-300">Address:</strong> {order.vendor.address}</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default OrderDeliveryPage;
