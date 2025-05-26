import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink } from "@/components/ui/breadcrumb";
import OrderForm from "./OrderForm";

const CreateOrderPage = () => {
  return (
    <div className="container mx-auto space-y-6">
      

      <Card>
        <CardHeader>
          {/* <CardTitle>Order Information</CardTitle> */}
        </CardHeader>
        <CardContent>
          <OrderForm mode="create" />
        </CardContent>
      </Card>
    </div>
  );
};

export default CreateOrderPage;
