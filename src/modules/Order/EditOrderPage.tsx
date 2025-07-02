import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import OrderForm from "./OrderForm";
import { get } from "@/services/apiService";
import {
  Card,
  CardContent
} from "@/components/ui/card";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink } from "@/components/ui/breadcrumb";
import { HomeIcon, Package } from "lucide-react";

const EditOrderPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [orderData, setOrderData] = useState<any>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["order", id],
    queryFn: async () => {
      const response = await get(`/vendor-orders/${id}`);
      return response;
    },
  });

  useEffect(() => {
    if (data) {
      // Transform API data to match the form's expected structure
      const formattedData = {
        poNumber: data.poNumber,
        orderDate: new Date(data.orderDate),
        deliveryDate: new Date(data.deliveryDate),
        contactPersonName: data.contactPersonName,
        vendorId: data.vendorId,
        notes: data.notes || "",
        orderItems: data.items.map((item: any) => ({
          productId: item.productId,
          quantity: item.quantity,
          agencyId: item.agencyId || "",
          depotId: String(item.depotId || ""),
          depotVariantId: String(item.depotVariantId || ""),
        })),
      };
      
      setOrderData(formattedData);
    }
  }, [data]);

  const handleSuccess = () => {
    navigate("/admin/orders");
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500" />
          </div>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="container mx-auto py-6">
        <div className="max-w-7xl mx-auto">
          <Card className="bg-red-50 dark:bg-red-950 border-red-100 dark:border-red-900">
            <CardContent className="p-6 text-center">
              <p className="text-red-600 dark:text-red-400">Failed to load order details. Please try again.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6">
      <div className="max-w-7xl mx-auto w-full mb-6">
 
      </div>

      {orderData && (
        <OrderForm 
          mode="edit" 
          orderId={id} 
          initialData={orderData} 
          onSuccess={handleSuccess} 
        />
      )}
    </div>
  );
};

export default EditOrderPage;
